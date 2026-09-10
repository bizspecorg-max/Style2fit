import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, MessageCircle, Phone, Printer, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
	ORDER_STATUSES,
	PAYMENT_STATUSES,
	PAYMENT_TONE,
	STATUS_TONE,
	fieldsForStyle,
	isOverdue,
	nextStatus,
	useOrder,
	type Order,
} from "@/lib/orders";
import { formatDate, formatMoney, useShop, whatsappLink } from "@/lib/shop";
import { formatMeasure } from "@/lib/units";
import { cn } from "@/lib/utils";

const OrderDetail = () => {
	const { id } = useParams();
	const { t } = useTranslation();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: order, isLoading, isError, refetch } = useOrder(id);
	const [busy, setBusy] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (order) document.title = `${order.code} · Style2Fit`;
	}, [order]);

	const refresh = () => {
		for (const key of ["order", "orders", "dashboard", "customer"]) queryClient.invalidateQueries({ queryKey: [key] });
	};

	const update = async (patch: Partial<Pick<Order, "status" | "payment_status">>, label: string) => {
		if (!order) return;
		setBusy(label);
		const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
		setBusy(null);
		if (error) return toast.error(error.message);
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
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40 w-full rounded-2xl" />
				<Skeleton className="h-56 w-full rounded-2xl" />
			</div>
		);
	}

	if (isError || !order) {
		return (
			<div className="rounded-2xl border bg-card p-8 text-center">
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

	const current = ORDER_STATUSES.indexOf(order.status);
	const upcoming = nextStatus(order.status);
	const overdue = isOverdue(order);
	const labels = new Map(fieldsForStyle(order.styles).map((f) => [f.key, f.label]));
	// Order measurements were saved without a unit; they were taken in the shop's unit.
	const measurements = Object.entries(order.measurement_values ?? {})
		.filter(([, v]) => v)
		.map(([key, value]) => ({ label: labels.get(key) ?? key.replace(/_/g, " "), value: formatMeasure(value, shop.unit, shop.unit, shop.locale) }));
	const customerName = order.customers?.name ?? "";
	const styleName = order.styles?.name ?? t("orders.detail.yourOutfit");
	const message =
		order.status === "ready"
			? t("orders.detail.msgReady", { name: customerName, style: styleName, code: order.code })
			: t("orders.detail.msgUpdate", { name: customerName, style: styleName, code: order.code, status: t(`orderStatus.${order.status}`).toLowerCase() });
	const image = order.image_url ?? order.styles?.image_url;

	return (
		<div className="space-y-6">
			<Link to="/orders" className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden">
				<ArrowLeft className="h-4 w-4" />
				{t("nav.orders")}
			</Link>

			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="font-mono text-sm text-muted-foreground">{order.code}</p>
					<h1 className="font-display text-3xl font-bold">{customerName}</h1>
					<div className="mt-2 flex flex-wrap gap-2">
						<Badge variant="secondary" className={STATUS_TONE[order.status]}>
							{t(`orderStatus.${order.status}`)}
						</Badge>
						<Badge variant="secondary" className={PAYMENT_TONE[order.payment_status]}>
							{t(`paymentStatus.${order.payment_status}`)}
						</Badge>
						{overdue && <Badge className="bg-destructive text-white">{t("orders.overdue")}</Badge>}
					</div>
				</div>
				<div className="flex gap-2 print:hidden">
					<Button variant="outline" className="h-10" onClick={() => window.print()}>
						<Printer className="h-4 w-4" />
						{t("orders.detail.print")}
					</Button>
					<Button variant="outline" size="icon" className="h-10 w-10 text-destructive" aria-label={t("orders.detail.delete")} onClick={() => setConfirmDelete(true)}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</header>

			{/* Progress */}
			<section className="rounded-2xl border bg-card p-5 print:hidden">
				<ol className="grid grid-cols-4 gap-2" aria-label={t("orders.detail.progress")}>
					{ORDER_STATUSES.map((s, i) => (
						<li key={s} className="flex flex-col items-center gap-2 text-center" aria-current={i === current ? "step" : undefined}>
							<span
								className={cn(
									"flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
									i < current && "border-primary bg-primary text-primary-foreground",
									i === current && "border-primary text-primary",
									i > current && "border-border text-muted-foreground"
								)}
							>
								{i < current ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
							</span>
							<span className={cn("text-xs font-medium", i === current ? "text-foreground" : "text-muted-foreground")}>{t(`orderStatus.${s}`)}</span>
						</li>
					))}
				</ol>
				<div className="mt-5 flex flex-col gap-2 sm:flex-row">
					{upcoming && (
						<Button className="h-11 flex-1" disabled={!!busy} onClick={() => update({ status: upcoming }, "status")}>
							{busy === "status" ? t("common.saving") : t("orders.detail.markAs", { status: t(`orderStatus.${upcoming}`) })}
						</Button>
					)}
					<Button variant="secondary" className="h-11 flex-1 bg-[#1f7a4d] text-white hover:bg-[#1a6841]" asChild>
						<a href={whatsappLink(order.customers?.phone, message)} target="_blank" rel="noreferrer">
							<MessageCircle className="h-4 w-4" />
							{order.status === "ready" ? t("orders.detail.tellReady") : t("orders.detail.sendUpdate")}
						</a>
					</Button>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
				<div className="space-y-6">
					<section className="rounded-2xl border bg-card p-5">
						<h2 className="font-display text-lg font-bold">{t("orders.detail.measurements")}</h2>
						{measurements.length === 0 ? (
							<p className="mt-3 text-sm text-muted-foreground">{t("measure.noValues")}</p>
						) : (
							<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
								{measurements.map((m) => (
									<div key={m.label} className="flex items-baseline justify-between gap-2 border-b border-dashed pb-1.5">
										<dt className="truncate text-sm text-muted-foreground">{m.label}</dt>
										<dd className="text-sm font-semibold tabular-nums">{m.value}</dd>
									</div>
								))}
							</dl>
						)}
					</section>
					{order.notes && (
						<section className="rounded-2xl border bg-card p-5">
							<h2 className="font-display text-lg font-bold">{t("orders.detail.notes")}</h2>
							<p className="mt-2 whitespace-pre-line text-sm">{order.notes}</p>
						</section>
					)}
				</div>

				<aside className="space-y-6">
					<section className="overflow-hidden rounded-2xl border bg-card">
						<div className="flex aspect-[4/3] items-center justify-center bg-muted">
							{image ? <img src={image} alt={styleName} className="h-full w-full object-cover" /> : <Shirt className="h-10 w-10 text-muted-foreground" aria-hidden />}
						</div>
						<dl className="space-y-3 p-5 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.steps.style")}</dt>
								<dd className="text-right font-medium">{styleName}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.total")}</dt>
								<dd className="font-semibold tabular-nums">{formatMoney(order.price, shop.currency, shop.locale)}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.deliveryDate")}</dt>
								<dd className={cn("inline-flex items-center gap-1 font-medium", overdue && "text-destructive")}>
									<CalendarClock className="h-3.5 w-3.5" aria-hidden />
									{formatDate(order.delivery_date, shop.locale)}
								</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.detail.created")}</dt>
								<dd>{formatDate(order.created_at, shop.locale)}</dd>
							</div>
						</dl>
					</section>

					<section className="rounded-2xl border bg-card p-5 print:hidden">
						<h2 className="text-sm font-semibold">{t("orders.new.payment")}</h2>
						<div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("orders.new.payment")}>
							{PAYMENT_STATUSES.map((p) => (
								<button
									key={p}
									type="button"
									role="radio"
									aria-checked={order.payment_status === p}
									disabled={!!busy}
									onClick={() => order.payment_status !== p && update({ payment_status: p }, "payment")}
									className={cn(
										"h-10 rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										order.payment_status === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
									)}
								>
									{t(`paymentStatus.${p}`)}
								</button>
							))}
						</div>
					</section>

					<section className="rounded-2xl border bg-card p-5">
						<h2 className="text-sm font-semibold">{t("orders.new.steps.customer")}</h2>
						<Link to={`/customers/${order.customer_id}`} className="mt-2 block font-medium text-primary underline-offset-4 hover:underline">
							{customerName}
						</Link>
						{order.customers?.phone && (
							<Button variant="secondary" className="mt-3 h-10 w-full justify-start print:hidden" asChild>
								<a href={`tel:${order.customers.phone}`}>
									<Phone className="h-4 w-4" />
									{order.customers.phone}
								</a>
							</Button>
						)}
					</section>
				</aside>
			</div>

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("orders.detail.deleteTitle", { code: order.code })}</AlertDialogTitle>
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
