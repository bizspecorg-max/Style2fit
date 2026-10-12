import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageCircle, Pencil, Plus, Ruler, Search, ShoppingBag, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { Avatar, EmptyState, PageHeader } from "@/components/ui-kit";
import { DataTable, RowNum, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomers, type CustomerRow } from "@/lib/customers";
import { formatDate, formatPhone, whatsappLink } from "@/lib/shop";

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

	const flat = useMemo(() => sections.flatMap(([, group]) => group), [sections]);

	const actionsFor = (c: CustomerRow) => [
		{ label: t("customers.actions.view"), icon: Users, to: `/customers/${c.id}` },
		{ label: t("customers.actions.newOrder"), icon: ShoppingBag, to: `/orders/new?customer=${c.id}` },
		{ label: t("customers.actions.measure"), icon: Ruler, to: `/quick-measure?customer=${c.id}` },
		...(c.phone ? [{ label: t("customers.actions.message"), icon: MessageCircle, href: whatsappLink(c.phone, "") }] : []),
		{ label: t("customers.actions.edit"), icon: Pencil, to: `/customers/${c.id}?edit=1` },
	];

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
					<Button onClick={() => setAdding(true)} className="h-11 rounded-md px-5">
						<Plus className="h-4 w-4" />
						{t("customers.add")}
					</Button>
				}
			/>

			{customers.length > 0 && (
				<div className="relative">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("customers.search")} aria-label={t("customers.search")} className="h-12 rounded-md bg-card pl-11 shadow-card" />
				</div>
			)}

			{isLoading ? (
				<div className="space-y-2" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-[4.5rem] w-full rounded-md" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-md border bg-card p-8 text-center">
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
						<Button className="h-11 rounded-md px-6" onClick={() => setAdding(true)}>
							<Plus className="h-4 w-4" />
							{t("customers.addFirst")}
						</Button>
					}
				/>
			) : sections.length === 0 ? (
				<p className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q })}</p>
			) : (
				<>
					<DataTable>
						<THead>
							<TR className="hover:bg-transparent">
								<TH numeric className="w-12">#</TH>
								<TH>{t("customers.col.name")}</TH>
								<TH>{t("customers.col.phone")}</TH>
								<TH>{t("customers.col.email")}</TH>
								<TH numeric>{t("customers.col.orders")}</TH>
								<TH numeric>{t("customers.col.measurements")}</TH>
								<TH>{t("customers.col.added")}</TH>
								<TH className="w-14 text-right">{t("customers.col.actions")}</TH>
							</TR>
						</THead>
						<TBody>
							{flat.map((c, i) => (
								<TR key={c.id}>
									<RowNum n={i + 1} />
									<TD>
										<Link to={`/customers/${c.id}`} className="flex items-center gap-3 font-semibold hover:underline">
											<Avatar name={c.name} size="sm" />
											<span className="truncate">{c.name}</span>
										</Link>
									</TD>
									<TD className="whitespace-nowrap tabular-nums text-muted-foreground">{formatPhone(c.phone) || "—"}</TD>
									<TD className="max-w-[16rem] truncate text-muted-foreground">{c.email || "—"}</TD>
									<TD numeric>{c.orders?.[0]?.count ?? 0}</TD>
									<TD numeric>{c.measurements?.[0]?.count ?? 0}</TD>
									<TD className="whitespace-nowrap text-muted-foreground">{formatDate(c.created_at, i18n.language)}</TD>
									<TD className="text-right">
										<RowActions label={t("customers.actions.label", { name: c.name })} actions={actionsFor(c)} />
									</TD>
								</TR>
							))}
						</TBody>
					</DataTable>

					<div className="space-y-6 md:hidden">
					{sections.map(([letter, group]) => (
						<section key={letter} aria-label={letter}>
							<h2 className="sticky top-14 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1.5 font-display text-lg text-accent backdrop-blur md:top-0">{letter}</h2>
							<ul className="divide-y overflow-hidden rounded-md border bg-card shadow-card">
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
				</>
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
