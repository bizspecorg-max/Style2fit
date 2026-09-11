import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Ruler, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog, type Customer } from "@/components/CustomerFormDialog";
import { MeasurementDialog, type MeasurementRecord } from "@/components/MeasurementDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers } from "@/pages/Customers";
import { formatDate, formatPhone, initials, useShop } from "@/lib/shop";
import { toast } from "sonner";

type Recent = { id: string; title: string; created_at: string; customer_id: string; customers: { name: string } | null };

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
	const [target, setTarget] = useState<{ customer: Customer; last: MeasurementRecord | null } | null>(null);

	useEffect(() => {
		document.title = `${t("nav.quickMeasure")} · Style2Fit`;
	}, [t]);

	const matches = useMemo(() => {
		const s = q.trim().toLowerCase();
		const list = s ? customers.filter((c) => c.name.toLowerCase().includes(s) || (c.phone ?? "").includes(s)) : customers;
		return list.slice(0, 8);
	}, [customers, q]);

	const measure = async (customer: Customer) => {
		const { data } = await supabase
			.from("measurements")
			.select("id, title, fields, values, created_at")
			.eq("customer_id", customer.id)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		setTarget({ customer, last: (data as unknown as MeasurementRecord | null) ?? null });
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<header>
				<h1 className="font-display text-3xl font-bold">{t("nav.quickMeasure")}</h1>
				<p className="text-sm text-muted-foreground">{t("quick.subtitle")}</p>
			</header>

			<section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
				<h2 className="font-display text-lg font-bold">{t("quick.who")}</h2>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("customers.search")} aria-label={t("customers.search")} className="h-12 pl-9" />
					</div>
					<Button variant="outline" className="h-12" onClick={() => setAdding(true)}>
						<Plus className="h-4 w-4" />
						<span className="hidden sm:inline">{t("quick.newCustomer")}</span>
						<span className="sr-only sm:hidden">{t("quick.newCustomer")}</span>
					</Button>
				</div>
				{isLoading ? (
					<Skeleton className="h-32 w-full rounded-xl" />
				) : customers.length === 0 ? (
					<p className="rounded-xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">{t("quick.noCustomers")}</p>
				) : (
					<ul className="divide-y rounded-xl border">
						{matches.map((c) => (
							<li key={c.id}>
								<button
									type="button"
									onClick={() => measure(c)}
									className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
								>
									<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden>
										{initials(c.name)}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">{c.name}</span>
										<span className="block truncate text-sm text-muted-foreground">{c.phone ? formatPhone(c.phone) : t("customers.noContact")}</span>
									</span>
									<span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
										<Ruler className="h-4 w-4" aria-hidden />
										{t("quick.measure")}
									</span>
								</button>
							</li>
						))}
						{matches.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q })}</li>}
					</ul>
				)}
			</section>

			<section className="space-y-3">
				<h2 className="font-display text-lg font-bold">{t("quick.recent")}</h2>
				{loadingRecent ? (
					<Skeleton className="h-24 w-full rounded-xl" />
				) : recent.length === 0 ? (
					<p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{t("quick.noRecent")}</p>
				) : (
					<ul className="divide-y overflow-hidden rounded-2xl border bg-card">
						{recent.map((m) => (
							<li key={m.id}>
								<Link
									to={`/customers/${m.customer_id}`}
									className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">{m.customers?.name ?? "—"}</span>
										<span className="block truncate text-sm text-muted-foreground">
											{/\d{4}/.test(m.title)
												? m.title
												: `${m.title} · ${formatDate(m.created_at, shop.locale)}`}
										</span>
									</span>
									<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
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
