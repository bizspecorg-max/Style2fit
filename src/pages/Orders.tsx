import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, MessageCircle, Pencil, Plus, Search, ShoppingBag } from "lucide-react";
import { OrderRow } from "@/components/OrderRow";
import { EmptyState, PageHeader, SectionTitle, StatusPill } from "@/components/ui-kit";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
import { useDueLabel } from "@/components/OrderRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES, isOverdue, useOrders, type Order } from "@/lib/orders";
import { daysUntil, formatMoney, shortCode, useShop, whatsappLink } from "@/lib/shop";
import { cn } from "@/lib/utils";

const byDue = (a: Order, b: Order) => (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999");

const Orders = () => {
	const { t } = useTranslation();
	const shop = useShop();
	const dueLabel = useDueLabel();
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const { data: orders = [], isLoading, isError, refetch } = useOrders();
	const [q, setQ] = useState("");
	const status = params.get("status") ?? "all";

	// Older links (?new=1&style=…) open the new-order flow.
	useEffect(() => {
		if (params.get("new") !== "1") return;
		const style = params.get("style");
		navigate(`/orders/new${style ? `?style=${style}` : ""}`, { replace: true });
	}, [params, navigate]);

	useEffect(() => {
		document.title = `${t("nav.orders")} · Style2Fit`;
	}, [t]);

	const counts = useMemo(() => {
		const c: Record<string, number> = { all: orders.length, overdue: 0 };
		for (const o of orders) {
			c[o.status] = (c[o.status] ?? 0) + 1;
			if (isOverdue(o)) c.overdue++;
		}
		return c;
	}, [orders]);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		return orders.filter((o) => {
			if (status === "overdue" ? !isOverdue(o) : status !== "all" && o.status !== status) return false;
			return !s || o.code.toLowerCase().includes(s) || (o.customers?.name ?? "").toLowerCase().includes(s) || (o.styles?.name ?? "").toLowerCase().includes(s);
		});
	}, [orders, q, status]);

	// "All" with no search: group by what needs attention first.
	const groups = useMemo(() => {
		if (status !== "all" || q.trim()) return [{ key: "results", items: filtered }];
		const overdue: Order[] = [];
		const week: Order[] = [];
		const later: Order[] = [];
		const delivered: Order[] = [];
		for (const o of filtered) {
			if (o.status === "delivered") delivered.push(o);
			else if (isOverdue(o)) overdue.push(o);
			else if (o.delivery_date && daysUntil(o.delivery_date) <= 7) week.push(o);
			else later.push(o);
		}
		return [
			{ key: "overdue", items: overdue.sort(byDue) },
			{ key: "thisWeek", items: week.sort(byDue) },
			{ key: "later", items: later.sort(byDue) },
			{ key: "delivered", items: delivered.sort((a, b) => byDue(b, a)) },
		].filter((g) => g.items.length);
	}, [filtered, status, q]);

	const filters = ["all", ...ORDER_STATUSES, "overdue"] as const;

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("nav.orders")}
				subtitle={t("orders.count", { count: orders.length })}
				actions={
					<Button className="h-11 rounded-md px-5" asChild>
						<Link to="/orders/new">
							<Plus className="h-4 w-4" />
							{t("nav.newOrder")}
						</Link>
					</Button>
				}
			/>

			{orders.length > 0 && (
				<div className="space-y-3">
					<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label={t("orders.filter")}>
						{filters.map((f) => (
							<button
								key={f}
								type="button"
								aria-pressed={status === f}
								onClick={() => setParams(f === "all" ? {} : { status: f }, { replace: true })}
								className={cn(
									"inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									status === f ? "border-primary bg-primary text-primary-foreground shadow-card" : "bg-card hover:border-primary/30",
									f === "overdue" && counts.overdue > 0 && status !== f && "border-status-overdue/30 text-status-overdue"
								)}
							>
								{f === "all" ? t("orders.all") : f === "overdue" ? t("orders.overdue") : t(`orderStatus.${f}`)}
								<span className={cn("min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums", status === f ? "bg-white/15" : "bg-muted")}>{counts[f] ?? 0}</span>
							</button>
						))}
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("orders.search")} aria-label={t("orders.search")} className="h-12 rounded-md bg-card pl-11 shadow-card" />
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="space-y-3" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 w-full rounded-md" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-md border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : orders.length === 0 ? (
				<EmptyState
					icon={ClipboardList}
					title={t("orders.emptyTitle")}
					body={t("orders.emptyBody")}
					action={
						<Button className="h-11 rounded-md px-6" asChild>
							<Link to="/orders/new">
								<Plus className="h-4 w-4" />
								{t("orders.first")}
							</Link>
						</Button>
					}
				/>
			) : filtered.length === 0 ? (
				<p className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">{t("orders.noMatch")}</p>
			) : (
				<>
					<DataTable>
						<THead>
							<TR className="hover:bg-transparent">
								<TH>{t("orders.col.code")}</TH>
								<TH>{t("orders.col.customer")}</TH>
								<TH>{t("orders.col.style")}</TH>
								<TH>{t("orders.col.due")}</TH>
								<TH>{t("orders.col.status")}</TH>
								<TH>{t("orders.col.payment")}</TH>
								<TH numeric>{t("orders.col.price")}</TH>
								<TH className="w-14 text-right">{t("orders.col.actions")}</TH>
							</TR>
						</THead>
						<TBody>
							{[...filtered].sort(byDue).map((o) => {
								const due = dueLabel(o);
								return (
									<TR key={o.id}>
										<TD className="whitespace-nowrap font-mono text-xs text-muted-foreground">{o.code ? shortCode(o.code) : "—"}</TD>
										<TD>
											<Link to={`/orders/${o.id}`} className="font-semibold hover:underline">
												{o.customers?.name ?? "—"}
											</Link>
										</TD>
										<TD className="max-w-[14rem] truncate text-muted-foreground">{o.styles?.name ?? "—"}</TD>
										<TD className={cn("whitespace-nowrap", due.tone)}>{due.text}</TD>
										<TD><StatusPill tone={o.status}>{t(`orderStatus.${o.status}`)}</StatusPill></TD>
										<TD><StatusPill tone={o.payment_status}>{t(`paymentStatus.${o.payment_status}`)}</StatusPill></TD>
										<TD numeric className="font-medium">{formatMoney(o.price, shop.currency, shop.locale)}</TD>
										<TD className="text-right">
											<RowActions
												label={t("orders.col.actionsFor", { code: o.code ? shortCode(o.code) : o.id.slice(0, 6) })}
												actions={[
													{ label: t("orders.actions.view"), icon: ClipboardList, to: `/orders/${o.id}` },
													{ label: t("orders.actions.edit"), icon: Pencil, to: `/orders/${o.id}?edit=1` },
													...(o.customers?.phone ? [{ label: t("orders.actions.message"), icon: MessageCircle, href: whatsappLink(o.customers.phone, "") }] : []),
													...(o.customer_id ? [{ label: t("orders.actions.repeat"), icon: ShoppingBag, to: `/orders/new?customer=${o.customer_id}` }] : []),
												]}
											/>
										</TD>
									</TR>
								);
							})}
						</TBody>
					</DataTable>

					<div className="space-y-8 md:hidden">
					{groups.map((g) => (
						<section key={g.key} aria-label={g.key === "results" ? undefined : t(`orders.group.${g.key}`)}>
							{g.key !== "results" && <SectionTitle count={g.items.length}>{t(`orders.group.${g.key}`)}</SectionTitle>}
							<ul className="space-y-3">
								{g.items.map((o) => (
									<li key={o.id}>
										<OrderRow order={o} />
									</li>
								))}
							</ul>
						</section>
					))}
					</div>
				</>
			)}
		</div>
	);
};

export default Orders;
