import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Ruler, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog, type Customer } from "@/components/CustomerFormDialog";
import { MeasurementDialog, type MeasurementRecord } from "@/components/MeasurementDialog";
import { Avatar, PageHeader, SectionTitle } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers } from "@/pages/Customers";
import { formatDate, formatPhone, useShop } from "@/lib/shop";

type Recent = { id: string; title: string; created_at: string; customer_id: string; customers: { name: string } | null };

const SHOWN = 8;

function useRecentMeasurements() {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["measurements-recent", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data, error } = await supabase
				.from("measurements")
				.select("id, title, created_at, customer_id, customers(name)")
				.order("created_at", { ascending: false })
				.limit(12);
			if (error) throw error;
			return (data ?? []) as unknown as Recent[];
		},
	});
}

/** Measure anyone fast: pick (or add) a customer and record — it's saved to their profile. */
const QuickMeasure = () => {
	const { t } = useTranslation();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: customers = [], isLoading } = useCustomers();
	const { data: recent = [], isLoading: loadingRecent } = useRecentMeasurements();
	const [q, setQ] = useState("");
	const [adding, setAdding] = useState(false);
	const [opening, setOpening] = useState<string | null>(null);
	const [target, setTarget] = useState<{ customer: Customer; last: MeasurementRecord | null } | null>(null);

	useEffect(() => {
		document.title = `${t("nav.quickMeasure")} · Style2Fit`;
	}, [t]);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		const digits = s.replace(/\D/g, "");
		return s ? customers.filter((c) => c.name.toLowerCase().includes(s) || (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))) : customers;
	}, [customers, q]);
	const matches = filtered.slice(0, SHOWN);

	const measure = async (customer: Customer) => {
		setOpening(customer.id);
		const { data } = await supabase
			.from("measurements")
			.select("id, title, fields, values, created_at")
			.eq("customer_id", customer.id)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		setOpening(null);
		setTarget({ customer, last: (data as unknown as MeasurementRecord | null) ?? null });
	};

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<PageHeader title={t("nav.quickMeasure")} subtitle={t("quick.subtitle")} />

			<section className="space-y-4 rounded-3xl border bg-card p-4 shadow-card sm:p-6">
				<h2 className="font-display text-xl">{t("quick.who")}</h2>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("customers.search")} aria-label={t("customers.search")} className="h-12 rounded-full pl-11" />
					</div>
					<Button variant="outline" className="h-12 rounded-full px-4" onClick={() => setAdding(true)}>
						<Plus className="h-4 w-4" />
						<span className="hidden sm:inline">{t("quick.newCustomer")}</span>
						<span className="sr-only sm:hidden">{t("quick.newCustomer")}</span>
					</Button>
				</div>
				{isLoading ? (
					<div className="space-y-2">
						{[0, 1, 2].map((i) => (
							<Skeleton key={i} className="h-16 w-full rounded-2xl" />
						))}
					</div>
				) : customers.length === 0 ? (
					<p className="rounded-2xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">{t("quick.noCustomers")}</p>
				) : (
					<>
						<ul className="space-y-2">
							{matches.map((c) => (
								<li key={c.id}>
									<button
										type="button"
										onClick={() => measure(c)}
										disabled={opening === c.id}
										className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
									>
										<Avatar name={c.name} size="sm" />
										<span className="min-w-0 flex-1">
											<span className="block truncate font-semibold">{c.name}</span>
											<span className="block truncate text-sm tabular-nums text-muted-foreground">{c.phone ? formatPhone(c.phone) : t("customers.noContact")}</span>
										</span>
										<span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary/[0.07] px-3 text-sm font-medium text-primary">
											<Ruler className="h-4 w-4" aria-hidden />
											{t("quick.measure")}
										</span>
									</button>
								</li>
							))}
						</ul>
						{matches.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q })}</p>}
						{filtered.length > SHOWN && <p className="text-center text-xs text-muted-foreground">{t("quick.searchMore", { count: filtered.length - SHOWN })}</p>}
					</>
				)}
			</section>

			<section>
				<SectionTitle count={recent.length || undefined}>{t("quick.recent")}</SectionTitle>
				{loadingRecent ? (
					<Skeleton className="h-24 w-full rounded-2xl" />
				) : recent.length === 0 ? (
					<p className="rounded-3xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{t("quick.noRecent")}</p>
				) : (
					<ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
						{recent.map((m) => (
							<li key={m.id}>
								<Link
									to={`/customers/${m.customer_id}`}
									className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
								>
									<Avatar name={m.customers?.name ?? "?"} size="sm" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold">{m.customers?.name ?? "—"}</span>
										<span className="block truncate text-sm text-muted-foreground">
											{/\d{4}/.test(m.title) ? m.title : `${m.title} · ${formatDate(m.created_at, shop.locale)}`}
										</span>
									</span>
									<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<CustomerFormDialog
				open={adding}
				onOpenChange={setAdding}
				onSaved={async (id) => {
					await queryClient.invalidateQueries({ queryKey: ["customers"] });
					const { data } = await supabase.from("customers").select("id, name, phone, email, notes, created_at").eq("id", id).maybeSingle();
					if (data) setTarget({ customer: data as Customer, last: null });
				}}
			/>
			{target && (
				<MeasurementDialog
					open={!!target}
					onOpenChange={(open) => !open && setTarget(null)}
					customerId={target.customer.id}
					last={target.last}
					onSaved={() => {
						const id = target.customer.id;
						queryClient.invalidateQueries({ queryKey: ["measurements-recent"] });
						queryClient.invalidateQueries({ queryKey: ["customer", id] });
						queryClient.invalidateQueries({ queryKey: ["customers"] });
						toast(t("quick.savedFor", { name: target.customer.name }), {
							action: { label: t("quick.view"), onClick: () => navigate(`/customers/${id}`) },
						});
					}}
				/>
			)}
		</div>
	);
};

export default QuickMeasure;
