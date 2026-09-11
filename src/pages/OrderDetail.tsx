import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, MessageCircle, MoreHorizontal, Phone, Printer, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDueLabel } from "@/components/OrderRow";
import { Avatar, MobileActionBar, StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ORDER_STATUSES, PAYMENT_STATUSES, fieldsForStyle, isOverdue, nextStatus, useOrder, type Order } from "@/lib/orders";
import { formatDate, formatMoney, formatPhone, shortCode, useShop, whatsappLink } from "@/lib/shop";
import { formatMeasure } from "@/lib/units";
import { cn } from "@/lib/utils";

const WHATSAPP = "border-[#1f7a4d]/25 bg-[#1f7a4d]/[0.07] text-[#1f7a4d] hover:bg-[#1f7a4d]/[0.12] hover:text-[#1f7a4d]";

const OrderDetail = () => {
	const { id } = useParams();
	const { t } = useTranslation();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const dueLabel = useDueLabel();
	const { data: order, isLoading, isError, refetch } = useOrder(id);
	const [busy, setBusy] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (order) document.title = `${t("orders.detail.orderNo", { code: shortCode(order.code) })} · Style2Fit`;
	}, [order, t]);

	const refresh = () => {
		for (const key of ["order", "orders", "dashboard", "customer"]) queryClient.invalidateQueries({ queryKey: [key] });
	};

	const update = async (patch: Partial<Pick<Order, "status" | "payment_status">>, label: string) => {
		if (!order) return;
		// Show the change straight away; put it back if the save fails.
		const key = ["order", id];
		const previous = queryClient.getQueryData<Order | null>(key);
		queryClient.setQueryData<Order | null>(key, (o) => (o ? { ...o, ...patch } : o));
		setBusy(label);
		const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
		setBusy(null);
		if (error) {
			queryClient.setQueryData(key, previous);
			return toast.error(error.message);
		}
		toast.success(t("orders.detail.updated"));
		refresh();
	};

	const remove = async () => {
		if (!order) return;
		const { error } = await supabase.from("orders").delete().eq("id", order.id);
		if (error) return toast.error(error.message);
		toast.success(t("orders.detail.deleted"));
		refresh();
		navigate("/orders", { replace: true });
	};

	if (isLoading) {
		return (
			<div className="space-y-4" role="status" aria-label={t("common.loading")}>
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-12 w-64" />
				<Skeleton className="h-64 w-full rounded-3xl" />
				<Skeleton className="h-40 w-full rounded-3xl" />
			</div>
		);
	}

	if (isError || !order) {
		return (
			<div className="rounded-3xl border bg-card p-8 text-center">
				<p className="text-sm text-muted-foreground">{isError ? t("common.loadError") : t("orders.detail.notFound")}</p>
				<div className="mt-4 flex justify-center gap-2">
					{isError && (
						<Button variant="outline" onClick={() => refetch()}>
							{t("common.retry")}
						</Button>
					)}
					<Button asChild>
						<Link to="/orders">{t("orders.detail.back")}</Link>
					</Button>
				</div>
			</div>
		);
	}

	const code = shortCode(order.code);
	const current = ORDER_STATUSES.indexOf(order.status);
	const upcoming = nextStatus(order.status);
	const overdue = isOverdue(order);
	const due = dueLabel(order);
	const labels = new Map(fieldsForStyle(order.styles).map((f) => [f.key, f.label]));
	// Order measurements were saved without a unit; they were taken in the shop's unit.
	const measurements = Object.entries(order.measurement_values ?? {})
		.filter(([, v]) => v)
		.map(([key, value]) => ({ label: labels.get(key) ?? key.replace(/_/g, " "), value: formatMeasure(value, shop.unit, shop.unit, shop.locale) }));
	const customerName = order.customers?.name ?? "";
	const phone = order.customers?.phone;
	const styleName = order.styles?.name ?? t("orders.detail.yourOutfit");
	const message =
		order.status === "ready"
			? t("orders.detail.msgReady", { name: customerName, style: styleName, code })
			: t("orders.detail.msgUpdate", { name: customerName, style: styleName, code, status: t(`orderStatus.${order.status}`).toLowerCase() });
	const whatsappLabel = order.status === "ready" ? t("orders.detail.tellReady") : t("orders.detail.sendUpdate");
	const image = order.image_url ?? order.styles?.image_url;
	const advance = () => upcoming && update({ status: upcoming }, "status");
	const advanceLabel = upcoming && (busy === "status" ? t("common.saving") : t("orders.detail.markAs", { status: t(`orderStatus.${upcoming}`) }));

	return (
		<div className="space-y-6">
			<Link to="/orders" className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden">
				<ArrowLeft className="h-4 w-4" />
				{t("nav.orders")}
			</Link>

			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="eyebrow">
						{t("orders.detail.orderNo", { code })} · {formatDate(order.created_at, shop.locale)}
					</p>
					<h1 className="mt-1.5 break-words font-display text-3xl leading-tight sm:text-4xl">{order.styles?.name ?? "—"}</h1>
					<p className="mt-1 text-muted-foreground">
						{t("orders.detail.for")}{" "}
						<Link to={`/customers/${order.customer_id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
							{customerName}
						</Link>
					</p>
					<div className="mt-3 flex flex-wrap gap-1.5">
						<StatusPill tone={order.status}>{t(`orderStatus.${order.status}`)}</StatusPill>
						<StatusPill tone={order.payment_status}>{t(`paymentStatus.${order.payment_status}`)}</StatusPill>
						{overdue && <StatusPill tone="overdue">{t("orders.overdue")}</StatusPill>}
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-card print:hidden" aria-label={t("orders.detail.more")}>
							<MoreHorizontal className="h-5 w-5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuItem onSelect={() => window.print()}>
							<Printer className="mr-2 h-4 w-4" />
							{t("orders.detail.print")}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
							<Trash2 className="mr-2 h-4 w-4" />
							{t("orders.detail.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			{/* Summary: photo, price, pickup and progress */}
			<section className="grid overflow-hidden rounded-3xl border bg-card shadow-card sm:grid-cols-[15rem_1fr]">
				<div className="flex aspect-[4/3] items-center justify-center bg-muted sm:aspect-auto">
					{image ? <img src={image} alt={styleName} className="h-full w-full object-cover" /> : <Shirt className="h-10 w-10 text-muted-foreground" aria-hidden />}
				</div>
				<div className="p-5 sm:p-6">
					<dl className="grid grid-cols-2 gap-4">
						<div>
							<dt className="eyebrow">{t("orders.new.total")}</dt>
							<dd className="mt-1 font-display text-3xl tabular-nums">{formatMoney(order.price, shop.currency, shop.locale)}</dd>
						</div>
						<div>
							<dt className="eyebrow">{t("orders.detail.pickup")}</dt>
							<dd className={cn("mt-1.5 font-display text-xl leading-tight", due.tone)}>{due.text}</dd>
							{order.delivery_date && order.status !== "delivered" && <dd className="text-xs text-muted-foreground">{formatDate(order.delivery_date, shop.locale)}</dd>}
						</div>
					</dl>

					<ol className="mt-7 flex items-start print:hidden" aria-label={t("orders.detail.progress")}>
						{ORDER_STATUSES.map((s, i) => (
							<li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
								{i > 0 && <span className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-primary" : "bg-border")} aria-hidden />}
								<span
									className={cn(
										"relative flex h-7 w-7 items-center justify-center rounded-full border-2 bg-card text-xs font-semibold",
										i < current && "border-primary bg-primary text-primary-foreground",
										i === current && "border-primary text-primary ring-4 ring-primary/10",
										i > current && "border-border text-muted-foreground"
									)}
								>
									{i < current ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
								</span>
								<span className={cn("mt-2 text-[11px] font-medium leading-tight sm:text-xs", i === current ? "text-foreground" : "text-muted-foreground")}>{t(`orderStatus.${s}`)}</span>
							</li>
						))}
					</ol>

					<div className="mt-6 hidden gap-2 md:flex print:!hidden">
						{upcoming && (
							<Button className="h-11 flex-1 rounded-full" disabled={!!busy} onClick={advance}>
								{advanceLabel}
							</Button>
						)}
						<Button variant="outline" className={cn("h-11 flex-1 rounded-full", WHATSAPP)} asChild>
							<a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer">
								<MessageCircle className="h-4 w-4" />
								{whatsappLabel}
							</a>
						</Button>
					</div>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
				<div className="space-y-6">
					<section className="rounded-3xl border bg-card p-5 shadow-card sm:p-6">
						<h2 className="font-display text-xl">{t("orders.detail.measurements")}</h2>
						{measurements.length === 0 ? (
							<p className="mt-3 text-sm text-muted-foreground">{t("measure.noValues")}</p>
						) : (
							<dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
								{measurements.map((m) => (
									<div key={m.label} className="rounded-2xl bg-muted/60 px-3.5 py-2.5">
										<dt className="truncate text-xs text-muted-foreground">{m.label}</dt>
										<dd className="mt-0.5 font-display text-lg tabular-nums">{m.value}</dd>
									</div>
								))}
							</dl>
						)}
					</section>
					{order.notes && (
						<section className="rounded-3xl border bg-card p-5 shadow-card sm:p-6">
							<h2 className="font-display text-xl">{t("orders.detail.notes")}</h2>
							<p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{order.notes}</p>
						</section>
					)}
				</div>

				<aside className="space-y-6">
					<section className="rounded-3xl border bg-card p-5 shadow-card print:hidden">
						<h2 className="eyebrow">{t("orders.new.payment")}</h2>
						<div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label={t("orders.new.payment")}>
							{PAYMENT_STATUSES.map((p) => (
								<button
									key={p}
									type="button"
									role="radio"
									aria-checked={order.payment_status === p}
									disabled={!!busy}
									onClick={() => order.payment_status !== p && update({ payment_status: p }, "payment")}
									className={cn(
										"h-10 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										order.payment_status === p ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
									)}
								>
									{t(`paymentStatus.${p}`)}
								</button>
							))}
						</div>
					</section>

					<section className="rounded-3xl border bg-card p-5 shadow-card">
						<h2 className="eyebrow">{t("orders.new.steps.customer")}</h2>
						<Link to={`/customers/${order.customer_id}`} className="mt-3 flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							<Avatar name={customerName || "?"} />
							<span className="min-w-0">
								<span className="block truncate font-semibold">{customerName}</span>
								{phone && <span className="block truncate text-sm tabular-nums text-muted-foreground">{formatPhone(phone)}</span>}
							</span>
						</Link>
						{phone && (
							<div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
								<Button variant="outline" className="h-10 rounded-full" asChild>
									<a href={`tel:${phone}`}>
										<Phone className="h-4 w-4" />
										{t("customers.call")}
									</a>
								</Button>
								<Button variant="outline" className={cn("h-10 rounded-full", WHATSAPP)} asChild>
									<a href={whatsappLink(phone)} target="_blank" rel="noreferrer">
										<MessageCircle className="h-4 w-4" />
										{t("customers.whatsapp")}
									</a>
								</Button>
							</div>
						)}
					</section>
				</aside>
			</div>

			<MobileActionBar>
				{upcoming ? (
					<>
						<Button className="h-12 flex-1 rounded-full" disabled={!!busy} onClick={advance}>
							{advanceLabel}
						</Button>
						<Button variant="outline" size="icon" className={cn("h-12 w-12 shrink-0 rounded-full", WHATSAPP)} aria-label={whatsappLabel} asChild>
							<a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer">
								<MessageCircle className="h-5 w-5" />
							</a>
						</Button>
					</>
				) : (
					<Button variant="outline" className={cn("h-12 flex-1 rounded-full", WHATSAPP)} asChild>
						<a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer">
							<MessageCircle className="h-4 w-4" />
							{whatsappLabel}
						</a>
					</Button>
				)}
			</MobileActionBar>

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent className="rounded-3xl">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("orders.detail.deleteTitle", { code })}</AlertDialogTitle>
						<AlertDialogDescription>{t("orders.detail.deleteBody")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>
							{t("orders.detail.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default OrderDetail;
