import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Copy, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Ruler, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog, type Customer } from "@/components/CustomerFormDialog";
import { MeasurementDialog, type MeasurementRecord } from "@/components/MeasurementDialog";
import { OrderRow } from "@/components/OrderRow";
import { Avatar, MobileActionBar } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TEMPLATES, type Category } from "@/lib/measurementTemplates";
import { ORDER_SELECT, humanizeKey, type Order } from "@/lib/orders";
import { formatDate, formatPhone, shortCode, useShop, whatsappLink } from "@/lib/shop";
import { formatMeasure, normalizeUnit, type MeasureUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

/** One card in the history: a saved measurement, or the measurements taken on an order. */
type HistoryEntry = {
	id: string;
	source: "measurement" | "order";
	title: string;
	subtitle?: string;
	date: string;
	unit: MeasureUnit;
	items: { label: string; value: string }[];
	record?: MeasurementRecord;
};

const PILL =
	"inline-flex h-10 max-w-full items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium shadow-card transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const WHATSAPP_PILL = "border-[#1f7a4d]/20 bg-[#1f7a4d]/[0.07] text-[#1f7a4d] hover:border-[#1f7a4d]/40";

function useCustomer(id: string | undefined) {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["customer", id],
		enabled: !!user && !!id,
		queryFn: async () => {
			const [customer, measurements, orders] = await Promise.all([
				supabase.from("customers").select("id, name, phone, email, notes, created_at").eq("id", id!).maybeSingle(),
				supabase.from("measurements").select("id, title, fields, values, created_at").eq("customer_id", id!).order("created_at", { ascending: false }),
				supabase.from("orders").select(ORDER_SELECT).eq("customer_id", id!).order("created_at", { ascending: false }),
			]);
			for (const r of [customer, measurements, orders]) if (r.error) throw r.error;
			return {
				customer: customer.data as Customer | null,
				measurements: (measurements.data ?? []) as unknown as MeasurementRecord[],
				orders: (orders.data ?? []) as unknown as Order[],
			};
		},
	});
}

function MeasurementCard({ entry, latest, customerName, onDelete }: { entry: HistoryEntry; latest: boolean; customerName: string; onDelete?: () => void }) {
	const { t } = useTranslation();
	const shop = useShop();
	const lines = entry.items.map((i) => ({ label: i.label, value: formatMeasure(i.value, entry.unit, shop.unit, shop.locale) }));
	const dateText = formatDate(entry.date, shop.locale);
	const shareText = [`${customerName} — ${entry.title}`, dateText, "", ...lines.map((l) => `${l.label}: ${l.value}`)].join("\n");

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(shareText);
			toast.success(t("measure.copied"));
		} catch {
			toast.error(t("measure.copyFailed"));
		}
	};

	return (
		<article className={cn("rounded-3xl border bg-card p-5 shadow-card", latest && "border-accent/30")}>
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="truncate font-display text-lg">{entry.title}</h3>
						{latest && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{t("customers.latest")}</span>}
					</div>
					<p className="text-xs text-muted-foreground">
						{/* Titles usually already carry the date — don't show it twice. */}
						{[entry.title.includes(dateText) ? null : dateText, entry.subtitle].filter(Boolean).join(" · ")}
					</p>
				</div>
				<div className="-mr-2 flex shrink-0">
					<Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={t("measure.copy")} onClick={copy}>
						<Copy className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={t("measure.shareWhatsApp")} asChild>
						<a href={whatsappLink(null, shareText)} target="_blank" rel="noreferrer">
							<Share2 className="h-4 w-4" />
						</a>
					</Button>
					{onDelete && (
						<Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-destructive hover:text-destructive" aria-label={t("measure.delete")} onClick={onDelete}>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</header>
			{lines.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">{t("measure.noValues")}</p>
			) : (
				<dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
					{lines.map((l, i) => (
						<div key={`${l.label}-${i}`} className="rounded-2xl bg-muted/60 px-3.5 py-2.5">
							<dt className="truncate text-xs text-muted-foreground">{l.label}</dt>
							<dd className="mt-0.5 font-display text-lg tabular-nums">{l.value}</dd>
						</div>
					))}
				</dl>
			)}
		</article>
	);
}

const CustomerDetail = () => {
	const { id } = useParams();
	const { t } = useTranslation();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data, isLoading, isError, refetch } = useCustomer(id);
	const [editing, setEditing] = useState(false);
	const [measuring, setMeasuring] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deletingMeasurement, setDeletingMeasurement] = useState<MeasurementRecord | null>(null);

	const customer = data?.customer;

	useEffect(() => {
		if (customer) document.title = `${customer.name} · Style2Fit`;
	}, [customer]);

	const history = useMemo<HistoryEntry[]>(() => {
		if (!data) return [];
		const fromMeasurements: HistoryEntry[] = data.measurements.map((m) => ({
			id: `m-${m.id}`,
			source: "measurement",
			title: m.title,
			date: m.created_at,
			unit: normalizeUnit(m.fields?.[0]?.unit) ?? shop.unit,
			items: (m.fields ?? []).filter((f) => (m.values ?? {})[f.key]).map((f) => ({ label: f.label, value: m.values[f.key] })),
			record: m,
		}));
		const fromOrders: HistoryEntry[] = data.orders
			.filter((o) => o.measurement_values && Object.values(o.measurement_values).some((v) => v))
			.map((o) => {
				const template = o.styles?.measurement_template?.length ? o.styles.measurement_template : TEMPLATES[(o.styles?.category ?? "") as Category] ?? [];
				const labels = new Map(template.map((f) => [f.key, f.label]));
				return {
					id: `o-${o.id}`,
					source: "order",
					title: o.styles?.name ?? t("measure.orderMeasurements"),
					subtitle: t("measure.fromOrder", { code: shortCode(o.code) }),
					date: o.created_at,
					// Order measurements were saved without a unit; they were taken in the shop's unit.
					unit: shop.unit,
					items: Object.entries(o.measurement_values ?? {})
						.filter(([, v]) => v)
						.map(([key, value]) => ({ label: labels.get(key) ?? humanizeKey(key), value })),
				};
			});
		return [...fromMeasurements, ...fromOrders].sort((a, b) => b.date.localeCompare(a.date));
	}, [data, shop.unit, t]);

	const refresh = () => queryClient.invalidateQueries({ queryKey: ["customer", id] });

	const deleteCustomer = async () => {
		if (!customer) return;
		const { error } = await supabase.from("customers").delete().eq("id", customer.id);
		if (error) {
			toast.error(data?.orders.length ? t("customers.deleteBlocked") : error.message);
			return;
		}
		toast.success(t("customers.deleted"));
		queryClient.invalidateQueries({ queryKey: ["customers"] });
		navigate("/customers", { replace: true });
	};

	const deleteMeasurement = async () => {
		if (!deletingMeasurement) return;
		const { error } = await supabase.from("measurements").delete().eq("id", deletingMeasurement.id);
		setDeletingMeasurement(null);
		if (error) return toast.error(error.message);
		toast.success(t("measure.deleted"));
		refresh();
		queryClient.invalidateQueries({ queryKey: ["customers"] });
	};

	if (isLoading) {
		return (
			<div className="space-y-4" role="status" aria-label={t("common.loading")}>
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-44 w-full rounded-3xl" />
				<Skeleton className="h-11 w-64 rounded-full" />
				<Skeleton className="h-48 w-full rounded-3xl" />
			</div>
		);
	}

	if (isError || !customer) {
		return (
			<div className="rounded-3xl border bg-card p-8 text-center">
				<p className="text-sm text-muted-foreground">{isError ? t("common.loadError") : t("customers.notFound")}</p>
				<div className="mt-4 flex justify-center gap-2">
					{isError && (
						<Button variant="outline" onClick={() => refetch()}>
							{t("common.retry")}
						</Button>
					)}
					<Button asChild>
						<Link to="/customers">{t("customers.backToList")}</Link>
					</Button>
				</div>
			</div>
		);
	}

	const lastMeasurement = data.measurements[0] ?? null;
	const newOrderHref = `/orders/new?customer=${customer.id}`;
	const summary = [
		t("customers.since", { date: formatDate(customer.created_at, shop.locale) }),
		data.orders.length ? t("customers.stats.orders", { count: data.orders.length }) : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="space-y-6">
			<Link
				to="/customers"
				className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<ArrowLeft className="h-4 w-4" />
				{t("customers.title")}
			</Link>

			<section className="rounded-3xl border bg-card p-5 shadow-card sm:p-7">
				<div className="flex items-start gap-4">
					<Avatar name={customer.name} size="lg" />
					<div className="min-w-0 flex-1 pt-1">
						<h1 className="break-words font-display text-2xl leading-tight sm:text-3xl">{customer.name}</h1>
						<p className="mt-1 text-sm text-muted-foreground">{summary}</p>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="-mr-2 h-10 w-10 shrink-0 rounded-full" aria-label={t("customers.more", { name: customer.name })}>
								<MoreHorizontal className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onSelect={() => setEditing(true)}>
								<Pencil className="mr-2 h-4 w-4" />
								{t("customers.editTitle")}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" />
								{t("customers.delete")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{customer.phone ? (
						<>
							<a href={`tel:${customer.phone}`} className={PILL}>
								<Phone className="h-4 w-4 shrink-0" aria-hidden />
								<span className="truncate tabular-nums">{formatPhone(customer.phone)}</span>
							</a>
							<a href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer" className={cn(PILL, WHATSAPP_PILL)}>
								<MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
								{t("customers.whatsapp")}
							</a>
						</>
					) : (
						<button type="button" onClick={() => setEditing(true)} className={cn(PILL, "border-dashed text-muted-foreground")}>
							<Plus className="h-4 w-4" aria-hidden />
							{t("customers.noPhone")}
						</button>
					)}
					{customer.email && (
						<a href={`mailto:${customer.email}`} className={PILL}>
							<Mail className="h-4 w-4 shrink-0" aria-hidden />
							<span className="truncate">{customer.email}</span>
						</a>
					)}
				</div>
				{customer.notes && <p className="mt-4 whitespace-pre-line rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">{customer.notes}</p>}

				<div className="mt-6 hidden gap-2 md:flex">
					<Button className="h-11 rounded-full px-5" onClick={() => setMeasuring(true)}>
						<Ruler className="h-4 w-4" />
						{t("measure.new")}
					</Button>
					<Button variant="outline" className="h-11 rounded-full px-5" asChild>
						<Link to={newOrderHref}>
							<Plus className="h-4 w-4" />
							{t("customers.orderCta")}
						</Link>
					</Button>
				</div>
			</section>

			<Tabs defaultValue="measurements">
				<TabsList className="h-12 w-full rounded-full bg-muted p-1 sm:w-auto">
					<TabsTrigger value="measurements" className="h-10 flex-1 gap-1.5 rounded-full px-4 data-[state=active]:shadow-card sm:flex-none">
						<Ruler className="h-4 w-4" />
						{t("measure.tab", { count: history.length })}
					</TabsTrigger>
					<TabsTrigger value="orders" className="h-10 flex-1 gap-1.5 rounded-full px-4 data-[state=active]:shadow-card sm:flex-none">
						<ClipboardList className="h-4 w-4" />
						{t("customers.ordersTab", { count: data.orders.length })}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="measurements" className="mt-4 space-y-3">
					{history.length === 0 ? (
						<div className="rounded-3xl border border-dashed bg-card p-8 text-center">
							<p className="text-sm text-muted-foreground">{t("measure.empty")}</p>
							<Button variant="outline" className="mt-4 rounded-full" onClick={() => setMeasuring(true)}>
								<Ruler className="h-4 w-4" />
								{t("measure.new")}
							</Button>
						</div>
					) : (
						history.map((entry, i) => (
							<MeasurementCard
								key={entry.id}
								entry={entry}
								latest={i === 0}
								customerName={customer.name}
								onDelete={entry.record ? () => setDeletingMeasurement(entry.record!) : undefined}
							/>
						))
					)}
					<p className="px-1 text-xs text-muted-foreground">
						{t("measure.unitNote", { unit: t(`measure.unitName.${shop.unit}`) })}{" "}
						<Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
							{t("nav.profile")}
						</Link>
					</p>
				</TabsContent>

				<TabsContent value="orders" className="mt-4">
					{data.orders.length === 0 ? (
						<div className="rounded-3xl border border-dashed bg-card p-8 text-center">
							<p className="text-sm text-muted-foreground">{t("customers.noOrders")}</p>
							<Button variant="outline" className="mt-4 rounded-full" asChild>
								<Link to={newOrderHref}>{t("customers.newOrder")}</Link>
							</Button>
						</div>
					) : (
						<ul className="space-y-3">
							{data.orders.map((o) => (
								<li key={o.id}>
									<OrderRow order={o} titleFrom="style" />
								</li>
							))}
						</ul>
					)}
				</TabsContent>
			</Tabs>

			<MobileActionBar>
				<Button variant="outline" className="h-12 flex-1 rounded-full bg-card" onClick={() => setMeasuring(true)}>
					<Ruler className="h-4 w-4" />
					{t("measure.new")}
				</Button>
				<Button className="h-12 flex-1 rounded-full" asChild>
					<Link to={newOrderHref}>
						<Plus className="h-4 w-4" />
						{t("customers.orderCta")}
					</Link>
				</Button>
			</MobileActionBar>

			<CustomerFormDialog
				open={editing}
				onOpenChange={setEditing}
				customer={customer}
				onSaved={() => {
					refresh();
					queryClient.invalidateQueries({ queryKey: ["customers"] });
				}}
			/>
			<MeasurementDialog
				open={measuring}
				onOpenChange={setMeasuring}
				customerId={customer.id}
				last={lastMeasurement}
				onSaved={() => {
					refresh();
					queryClient.invalidateQueries({ queryKey: ["customers"] });
				}}
			/>

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent className="rounded-3xl">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("customers.deleteTitle", { name: customer.name })}</AlertDialogTitle>
						<AlertDialogDescription>{data.orders.length ? t("customers.deleteBlocked") : t("customers.deleteBody")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						{!data.orders.length && (
							<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteCustomer}>
								{t("customers.delete")}
							</AlertDialogAction>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={!!deletingMeasurement} onOpenChange={(open) => !open && setDeletingMeasurement(null)}>
				<AlertDialogContent className="rounded-3xl">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("measure.deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{t("measure.deleteBody", { title: deletingMeasurement?.title })}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteMeasurement}>
							{t("measure.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default CustomerDetail;
