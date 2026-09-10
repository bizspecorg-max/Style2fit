import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog, type Customer } from "@/components/CustomerFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, initials, useShop } from "@/lib/shop";

export const useCustomers = () => {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["customers", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data, error } = await supabase
				.from("customers")
				.select("id, name, phone, email, notes, created_at")
				.order("name");
			if (error) throw error;
			return (data ?? []) as Customer[];
		},
	});
};

const Customers = () => {
	const { t } = useTranslation();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: customers = [], isLoading, isError, refetch } = useCustomers();
	const [q, setQ] = useState("");
	const [adding, setAdding] = useState(false);

	useEffect(() => {
		document.title = `${t("customers.title")} · Style2Fit`;
	}, [t]);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		const digits = s.replace(/\D/g, "");
		if (!s) return customers;
		return customers.filter(
			(c) =>
				c.name.toLowerCase().includes(s) ||
				(c.email ?? "").toLowerCase().includes(s) ||
				(digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
		);
	}, [customers, q]);

	return (
		<div className="space-y-5">
			<header className="flex items-end justify-between gap-3">
				<div>
					<h1 className="font-display text-3xl font-bold">{t("customers.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("customers.count", { count: customers.length })}</p>
				</div>
				<Button onClick={() => setAdding(true)} className="h-11">
					<Plus className="h-4 w-4" />
					{t("customers.add")}
				</Button>
			</header>

			{customers.length > 0 && (
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder={t("customers.search")}
						aria-label={t("customers.search")}
						className="h-12 pl-9"
					/>
				</div>
			)}

			{isLoading ? (
				<div className="space-y-2" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-16 w-full rounded-xl" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : customers.length === 0 ? (
				<div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
					<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-primary">
						<Users className="h-6 w-6" aria-hidden />
					</span>
					<h2 className="mt-4 font-display text-xl font-bold">{t("customers.emptyTitle")}</h2>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("customers.emptyBody")}</p>
					<Button className="mt-6 h-11" onClick={() => setAdding(true)}>
						<Plus className="h-4 w-4" />
						{t("customers.addFirst")}
					</Button>
				</div>
			) : filtered.length === 0 ? (
				<p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q })}</p>
			) : (
				<ul className="divide-y overflow-hidden rounded-2xl border bg-card">
					{filtered.map((c) => (
						<li key={c.id}>
							<Link
								to={`/customers/${c.id}`}
								className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
							>
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden>
									{initials(c.name)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium">{c.name}</span>
									<span className="block truncate text-sm text-muted-foreground">
										{[c.phone, c.email].filter(Boolean).join(" · ") || t("customers.noContact")}
									</span>
								</span>
								<span className="hidden text-xs text-muted-foreground sm:block">
									{t("customers.added_on", { date: formatDate(c.created_at, shop.locale) })}
								</span>
								<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
							</Link>
						</li>
					))}
				</ul>
			)}

			<CustomerFormDialog
				open={adding}
				onOpenChange={setAdding}
				onSaved={(id) => {
					queryClient.invalidateQueries({ queryKey: ["customers"] });
					navigate(`/customers/${id}`);
				}}
			/>
		</div>
	);
};

export default Customers;
