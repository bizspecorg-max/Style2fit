import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Copy, Mail, MessageCircle, Pencil, Phone, Plus, Ruler, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog, type Customer } from "@/components/CustomerFormDialog";
import { MeasurementDialog, type MeasurementRecord } from "@/components/MeasurementDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TEMPLATES, type Category, type MeasurementField } from "@/lib/measurementTemplates";
import { formatDate, formatMoney, initials, useShop, whatsappLink } from "@/lib/shop";
import { formatMeasure, normalizeUnit, type MeasureUnit } from "@/lib/units";

type OrderRow = {
	id: string;
	code: string;
	status: string;
	payment_status: string;
	delivery_date: string | null;
	price: number | null;
	created_at: string;
	measurement_values: Record<string, string> | null;
	styles: { name: string; category: string; measurement_template: MeasurementField[] | null } | null;
};

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

const STATUS_TONE: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	in_progress: "bg-blue-100 text-blue-800",
	ready: "bg-emerald-100 text-emerald-800",
	delivered: "bg-muted text-muted-foreground",
};

function useCustomer(id: string | undefined) {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["customer", id],
		enabled: !!user && !!id,
		queryFn: async () => {
			const [customer, measurements, orders] = await Promise.all([
				supabase.from("customers").select("id, name, phone, email, notes, created_at").eq("id", id!).maybeSingle(),
				supabase.from("measurements").select("id, title, fields, values, created_at").eq("customer_id", id!).order("created_at", { ascending: false }),
				supabase
					.from("orders")
					.select("id, code, status, payment_status, delivery_date, price, created_at, measurement_values, styles(name, category, measurement_template)")
					.eq("customer_id", id!)
					.order("created_at", { ascending: false }),
			]);
			for (const r of [customer, measurements, orders]) if (r.error) throw r.error;
			return {
				customer: customer.data as Customer | null,
				measurements: (measurements.data ?? []) as unknown as MeasurementRecord[],
				orders: (orders.data ?? []) as unknown as OrderRow[],
			};
		},
	});
}

function MeasurementCard({ entry, customerName, onDelete }: { entry: HistoryEntry; customerName: string; onDelete?: () => void }) {
	const { t } = useTranslation();
	const shop = useShop();
	const lines = entry.items.map((i) => ({ label: i.label, value: formatMeasure(i.value, entry.unit, shop.unit, shop.locale) }));
	const shareText = [
		`${customerName} — ${entry.title}`,
		formatDate(entry.date, shop.locale),
		"",
		...lines.map((l) => `${l.label}: ${l.value}`),
	].join("\n");

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(shareText);
			toast.success(t("measure.copied"));
		} catch {
			toast.error(t("measure.copyFailed"));
		}
	};

	return (
		<article className="rounded-2xl border bg-card p-4 sm:p-5">
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate font-semibold">{entry.title}</h3>
					<p className="text-xs text-muted-foreground">
						{formatDate(entry.date, shop.locale)}
						{entry.subtitle && ` · ${entry.subtitle}`}
					</p>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("measure.copy")} onClick={copy}>
						<Copy className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t("measure.shareWhatsApp")} asChild>
						<a href={whatsappLink(null, shareText)} target="_blank" rel="noreferrer">
							<Share2 className="h-4 w-4" />
						</a>
					</Button>
					{onDelete && (
						<Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label={t("measure.delete")} onClick={onDelete}>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</header>
			{lines.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">{t("measure.noValues")}</p>
			) : (
				<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
					{lines.map((l, i) => (
						<div key={`${l.label}-${i}`} className="flex items-baseline justify-between gap-2 border-b border-dashed pb-1.5">
							<dt className="truncate text-sm text-muted-foreground">{l.label}</dt>
							<dd className="text-sm font-semibold tabular-nums">{l.value}</dd>
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
		const fromMeasurements: HistoryEntry[] = data.measurements.map((m) => {
			const unit = normalizeUnit(m.fields?.[0]?.unit) ?? shop.unit;
			return {
				id: `m-${m.id}`,
				source: "measurement",
				title: m.title,
				date: m.created_at,
				unit,
				items: (m.fields ?? []).filter((f) => (m.values ?? {})[f.key]).map((f) => ({ label: f.label, value: m.values[f.key] })),
				record: m,
			};
		});
		const fromOrders: HistoryEntry[] = data.orders
			.filter((o) => o.measurement_values && Object.values(o.measurement_values).some((v) => v))
			.map((o) => {
				const template =
					o.styles?.measurement_template?.length ? o.styles.measurement_template : TEMPLATES[(o.styles?.category ?? "") as Category] ?? [];
				const labels = new Map(template.map((f) => [f.key, f.label]));
				return {
					id: `o-${o.id}`,
					source: "order",
					title: o.styles?.name ?? t("measure.orderMeasurements"),
					subtitle: t("measure.fromOrder", { code: o.code }),
					date: o.created_at,
					// Order measurements were saved without a unit; they were taken in the shop's unit.
					unit: shop.unit,
					items: Object.entries(o.measurement_values ?? {})
						.filter(([, v]) => v)
						.map(([key, value]) => ({ label: labels.get(key) ?? key.replace(/_/g, " "), value })),
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
	};

	if (isLoading) {
		return (
			<div className="space-y-4" role="status" aria-label={t("common.loading")}>
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-36 w-full rounded-2xl" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</div>
		);
	}

	if (isError || !customer) {
		return (
			<div className="rounded-2xl border bg-card p-8 text-center">
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

	return (
		<div className="space-y-6">
			<Link
				to="/customers"
				className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<ArrowLeft className="h-4 w-4" />
				{t("customers.title")}
			</Link>

			<section className="rounded-2xl border bg-card p-5 sm:p-6">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-center gap-4">
						<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden>
							{initials(customer.name)}
						</span>
						<div className="min-w-0">
							<h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{customer.name}</h1>
							<p className="text-sm text-muted-foreground">{t("customers.added_on", { date: formatDate(customer.created_at, shop.locale) })}</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" className="h-10" onClick={() => setEditing(true)}>
							<Pencil className="h-4 w-4" />
							{t("common.edit")}
						</Button>
						<Button variant="outline" size="icon" className="h-10 w-10 text-destructive" aria-label={t("customers.delete")} onClick={() => setConfirmDelete(true)}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="mt-5 grid gap-2 sm:grid-cols-3">
					{customer.phone ? (
						<>
							<Button variant="secondary" className="h-11 justify-start" asChild>
								<a href={`tel:${customer.phone}`}>
									<Phone className="h-4 w-4" />
									<span className="truncate">{customer.phone}</span>
								</a>
							</Button>
							<Button className="h-11 justify-start bg-[#1f7a4d] text-white hover:bg-[#1a6841]" asChild>
								<a href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer">
									<MessageCircle className="h-4 w-4" />
									{t("customers.whatsapp")}
								</a>
							</Button>
						</>
					) : (
						<p className="text-sm text-muted-foreground sm:col-span-2">{t("customers.noPhone")}</p>
					)}
					{customer.email && (
						<Button variant="secondary" className="h-11 justify-start" asChild>
							<a href={`mailto:${customer.email}`}>
								<Mail className="h-4 w-4" />
								<span className="truncate">{customer.email}</span>
							</a>
						</Button>
					)}
				</div>
				{customer.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-muted/60 p-3 text-sm">{customer.notes}</p>}
			</section>

			<Tabs defaultValue="measurements">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<TabsList className="h-11">
						<TabsTrigger value="measurements" className="h-9 gap-1.5">
							<Ruler className="h-4 w-4" />
							{t("measure.tab", { count: history.length })}
						</TabsTrigger>
						<TabsTrigger value="orders" className="h-9 gap-1.5">
							<ClipboardList className="h-4 w-4" />
							{t("customers.ordersTab", { count: data.orders.length })}
						</TabsTrigger>
					</TabsList>
					<Button className="h-11" onClick={() => setMeasuring(true)}>
						<Plus className="h-4 w-4" />
						{t("measure.new")}
					</Button>
				</div>

				<TabsContent value="measurements" className="mt-4 space-y-3">
					{history.length === 0 ? (
						<div className="rounded-2xl border border-dashed bg-card p-8 text-center">
							<p className="text-sm text-muted-foreground">{t("measure.empty")}</p>
						</div>
					) : (
						history.map((entry) => (
							<MeasurementCard
								key={entry.id}
								entry={entry}
								customerName={customer.name}
								onDelete={entry.record ? () => setDeletingMeasurement(entry.record!) : undefined}
							/>
						))
					)}
					<p className="text-xs text-muted-foreground">
						{t("measure.unitNote", { unit: t(`measure.unitName.${shop.unit}`) })}{" "}
						<Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
							{t("nav.profile")}
						</Link>
					</p>
				</TabsContent>

				<TabsContent value="orders" className="mt-4">
					{data.orders.length === 0 ? (
						<div className="rounded-2xl border border-dashed bg-card p-8 text-center">
							<p className="text-sm text-muted-foreground">{t("customers.noOrders")}</p>
							<Button variant="outline" className="mt-4" asChild>
								<Link to="/orders?new=1">{t("customers.newOrder")}</Link>
							</Button>
						</div>
					) : (
						<ul className="divide-y overflow-hidden rounded-2xl border bg-card">
							{data.orders.map((o) => (
								<li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
									<span className="font-mono text-xs">{o.code}</span>
									<span className="min-w-0 flex-1 truncate font-medium">{o.styles?.name ?? "—"}</span>
									<Badge variant="secondary" className={`capitalize ${STATUS_TONE[o.status] ?? ""}`}>
										{o.status.replace("_", " ")}
									</Badge>
									<span className="text-sm text-muted-foreground">
										{t("customers.due", { date: formatDate(o.delivery_date, shop.locale) })}
									</span>
									<span className="text-sm font-semibold tabular-nums">{formatMoney(o.price, shop.currency, shop.locale)}</span>
								</li>
							))}
						</ul>
					)}
				</TabsContent>
			</Tabs>

			<CustomerFormDialog
				open={editing}
				onOpenChange={setEditing}
				customer={customer}
				onSaved={() => {
					refresh();
					queryClient.invalidateQueries({ queryKey: ["customers"] });
				}}
			/>
			<MeasurementDialog open={measuring} onOpenChange={setMeasuring} customerId={customer.id} last={lastMeasurement} onSaved={refresh} />

			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("customers.deleteTitle", { name: customer.name })}</AlertDialogTitle>
						<AlertDialogDescription>
							{data.orders.length ? t("customers.deleteBlocked") : t("customers.deleteBody")}
						</AlertDialogDescription>
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
				<AlertDialogContent>
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
