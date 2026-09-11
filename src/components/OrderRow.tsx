import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, Shirt } from "lucide-react";
import { StatusPill } from "@/components/ui-kit";
import { isOverdue, type Order } from "@/lib/orders";
import { daysUntil, formatDate, formatMoney, shortCode, useShop } from "@/lib/shop";
import { cn } from "@/lib/utils";

/** Human due label: "2 days late", "Due today", "Due tomorrow", "In 3 days", "Due 28 Sept". */
export function useDueLabel() {
	const { t } = useTranslation();
	const shop = useShop();
	return (order: Pick<Order, "delivery_date" | "status">) => {
		if (order.status === "delivered") return { text: t("orders.due.delivered"), tone: "text-muted-foreground" };
		if (!order.delivery_date) return { text: t("orders.due.none"), tone: "text-muted-foreground" };
		const days = daysUntil(order.delivery_date);
		if (days < 0) return { text: t("orders.due.late", { count: -days }), tone: "text-status-overdue" };
		if (days === 0) return { text: t("orders.due.today"), tone: "text-status-pending" };
		if (days === 1) return { text: t("orders.due.tomorrow"), tone: "text-status-pending" };
		if (days <= 7) return { text: t("orders.due.inDays", { count: days }), tone: "text-foreground" };
		return { text: t("orders.due.on", { date: formatDate(order.delivery_date, shop.locale) }), tone: "text-muted-foreground" };
	};
}

/** The order card used on the orders list and the dashboard. */
export function OrderRow({ order, showPayment = true, titleFrom = "customer" }: { order: Order; showPayment?: boolean; titleFrom?: "customer" | "style" }) {
	const { t } = useTranslation();
	const shop = useShop();
	const dueLabel = useDueLabel();
	const due = dueLabel(order);
	const image = order.image_url ?? order.styles?.image_url;

	return (
		<Link
			to={`/orders/${order.id}`}
			className={cn(
				"group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card transition-all duration-200 sm:gap-4 sm:p-4",
				"hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isOverdue(order) && "border-status-overdue/25"
			)}
		>
			<span className="flex h-[4.5rem] w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-16">
				{image ? (
					<img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
				) : (
					<Shirt className="h-5 w-5 text-muted-foreground" aria-hidden />
				)}
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex items-baseline justify-between gap-3">
					<span className="truncate font-semibold">{(titleFrom === "style" ? order.styles?.name : order.customers?.name) ?? "—"}</span>
					<span className="shrink-0 font-display text-base tabular-nums sm:text-lg">{formatMoney(order.price, shop.currency, shop.locale)}</span>
				</span>
				<span className="mt-0.5 block truncate text-sm text-muted-foreground">
					{titleFrom === "customer" && <>{order.styles?.name ?? "—"} · </>}
					<span className="text-muted-foreground/70">{shortCode(order.code)}</span>
				</span>
				<span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
					<span className={cn("inline-flex items-center gap-1 text-xs font-medium", due.tone)}>
						<CalendarClock className="h-3.5 w-3.5" aria-hidden />
						{due.text}
					</span>
					<span className="flex gap-1.5">
						<StatusPill tone={order.status}>{t(`orderStatus.${order.status}`)}</StatusPill>
						{showPayment && <StatusPill tone={order.payment_status}>{t(`paymentStatus.${order.payment_status}`)}</StatusPill>}
					</span>
				</span>
			</span>
		</Link>
	);
}
