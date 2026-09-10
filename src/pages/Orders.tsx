import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ClipboardList, Plus, Search, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES, PAYMENT_TONE, STATUS_TONE, isOverdue, useOrders } from "@/lib/orders";
import { formatDate, formatMoney, useShop } from "@/lib/shop";
import { cn } from "@/lib/utils";

const Orders = () => {
	const { t } = useTranslation();
	const shop = useShop();
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
			return (
				!s ||
				o.code.toLowerCase().includes(s) ||
				(o.customers?.name ?? "").toLowerCase().includes(s) ||
				(o.styles?.name ?? "").toLowerCase().includes(s)
			);
		});
	}, [orders, q, status]);

	const filters = ["all", ...ORDER_STATUSES, "overdue"] as const;

	return (
		<div className="space-y-5">
			<header className="flex items-end justify-between gap-3">
				<div>
					<h1 className="font-display text-3xl font-bold">{t("nav.orders")}</h1>
					<p className="text-sm text-muted-foreground">{t("orders.count", { count: orders.length })}</p>
				</div>
				<Button className="h-11" asChild>
					<Link to="/orders/new">
						<Plus className="h-4 w-4" />
						{t("nav.newOrder")}
					</Link>
				</Button>
			</header>

			{orders.length > 0 && (
				<>
					<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label={t("orders.filter")}>
						{filters.map((f) => (
							<button
								key={f}
								type="button"
								aria-pressed={status === f}
								onClick={() => setParams(f === "all" ? {} : { status: f }, { replace: true })}
								className={cn(
									"inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									status === f ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
									f === "overdue" && counts.overdue > 0 && status !== f && "border-destructive/40 text-destructive"
								)}
							>
								{f === "all" ? t("orders.all") : f === "overdue" ? t("orders.overdue") : t(`orderStatus.${f}`)}
								<span className={cn("rounded-full px-1.5 text-xs tabular-nums", status === f ? "bg-primary-foreground/20" : "bg-muted")}>
									{counts[f] ?? 0}
								</span>
							</button>
						))}
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input
							type="search"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder={t("orders.search")}
							aria-label={t("orders.search")}
							className="h-12 pl-9"
						/>
					</div>
				</>
			)}

			{isLoading ? (
				<div className="space-y-2" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-20 w-full rounded-xl" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-2xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : orders.length === 0 ? (
				<div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
					<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-primary">
						<ClipboardList className="h-6 w-6" aria-hidden />
					</span>
					<h2 className="mt-4 font-display text-xl font-bold">{t("orders.emptyTitle")}</h2>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("orders.emptyBody")}</p>
					<Button className="mt-6 h-11" asChild>
						<Link to="/orders/new">
							<Plus className="h-4 w-4" />
							{t("orders.first")}
						</Link>
					</Button>
				</div>
			) : filtered.length === 0 ? (
				<p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("orders.noMatch")}</p>
			) : (
				<ul className="divide-y overflow-hidden rounded-2xl border bg-card">
					{filtered.map((o) => {
						const overdue = isOverdue(o);
						const image = o.image_url ?? o.styles?.image_url;
						return (
							<li key={o.id}>
								<Link
									to={`/orders/${o.id}`}
									className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
								>
									<span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted" aria-hidden>
										{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Shirt className="h-5 w-5 text-muted-foreground" />}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">{o.customers?.name ?? "—"}</span>
										<span className="block truncate text-xs text-muted-foreground">
											<span className="font-mono">{o.code}</span> · {o.styles?.name ?? "—"}
										</span>
										<span className={cn("block text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
											{overdue
												? t("orders.overdueOn", { date: formatDate(o.delivery_date, shop.locale) })
												: o.delivery_date
													? t("orders.dueOn", { date: formatDate(o.delivery_date, shop.locale) })
													: t("orders.noDueDate")}
										</span>
									</span>
									<span className="flex shrink-0 flex-col items-end gap-1">
										<span className="text-sm font-semibold tabular-nums">{formatMoney(o.price, shop.currency, shop.locale)}</span>
										<span className="flex gap-1">
											<Badge variant="secondary" className={STATUS_TONE[o.status]}>
												{t(`orderStatus.${o.status}`)}
											</Badge>
											<Badge variant="secondary" className={cn("hidden sm:inline-flex", PAYMENT_TONE[o.payment_status])}>
												{t(`paymentStatus.${o.payment_status}`)}
											</Badge>
										</span>
									</span>
									<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};

export default Orders;
