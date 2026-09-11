import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { Avatar, EmptyState, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomers, type CustomerRow } from "@/lib/customers";
import { formatPhone } from "@/lib/shop";

export type { CustomerRow };

export const useCustomers = () => {
	const { user } = useAuth();
	return useQuery({ queryKey: ["customers", user?.id], enabled: !!user, queryFn: fetchCustomers });
};

const letterOf = (name: string) => {
	const first = name.trim()[0]?.toLocaleUpperCase() ?? "#";
	return /\p{L}/u.test(first) ? first : "#";
};

const Customers = () => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: customers = [], isLoading, isError, refetch } = useCustomers();
	const [q, setQ] = useState("");
	const [adding, setAdding] = useState(false);

	useEffect(() => {
		document.title = `${t("customers.title")} · Style2Fit`;
	}, [t]);

	const sections = useMemo(() => {
		const s = q.trim().toLowerCase();
		const digits = s.replace(/\D/g, "");
		const list = s
			? customers.filter(
					(c) =>
						c.name.toLowerCase().includes(s) ||
						(c.email ?? "").toLowerCase().includes(s) ||
						(digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
				)
			: customers;
		const groups = new Map<string, CustomerRow[]>();
		for (const c of [...list].sort((a, b) => a.name.localeCompare(b.name, i18n.language))) {
			const key = letterOf(c.name);
			groups.set(key, [...(groups.get(key) ?? []), c]);
		}
		return [...groups.entries()];
	}, [customers, q, i18n.language]);

	const summary = (c: CustomerRow) => {
		const orders = c.orders?.[0]?.count ?? 0;
		const measures = c.measurements?.[0]?.count ?? 0;
		if (!orders && !measures) return t("customers.stats.new");
		return [orders ? t("customers.stats.orders", { count: orders }) : null, measures ? t("customers.stats.measurements", { count: measures }) : null]
			.filter(Boolean)
			.join(" · ");
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("customers.title")}
				subtitle={t("customers.count", { count: customers.length })}
				actions={
					<Button onClick={() => setAdding(true)} className="h-11 rounded-full px-5">
						<Plus className="h-4 w-4" />
						{t("customers.add")}
					</Button>
				}
			/>

			{customers.length > 0 && (
				<div className="relative">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("customers.search")} aria-label={t("customers.search")} className="h-12 rounded-full bg-card pl-11 shadow-card" />
				</div>
			)}

			{isLoading ? (
				<div className="space-y-2" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-2xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : customers.length === 0 ? (
				<EmptyState
					icon={Users}
					title={t("customers.emptyTitle")}
					body={t("customers.emptyBody")}
					action={
						<Button className="h-11 rounded-full px-6" onClick={() => setAdding(true)}>
							<Plus className="h-4 w-4" />
							{t("customers.addFirst")}
						</Button>
					}
				/>
			) : sections.length === 0 ? (
				<p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q })}</p>
			) : (
				<div className="space-y-6">
					{sections.map(([letter, group]) => (
						<section key={letter} aria-label={letter}>
							<h2 className="sticky top-14 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1.5 font-display text-lg text-accent backdrop-blur md:top-0">{letter}</h2>
							<ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
								{group.map((c) => (
									<li key={c.id}>
										<Link
											to={`/customers/${c.id}`}
											className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
										>
											<Avatar name={c.name} />
											<span className="min-w-0 flex-1">
												<span className="block truncate font-semibold">{c.name}</span>
												<span className="block truncate text-sm text-muted-foreground">{summary(c)}</span>
											</span>
											<span className="hidden text-sm tabular-nums text-muted-foreground md:block">{formatPhone(c.phone)}</span>
											<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
										</Link>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
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
