import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TEMPLATES, type Category, type MeasurementField } from "@/lib/measurementTemplates";

export const ORDER_STATUSES = ["pending", "in_progress", "ready", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "part_payment", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STATUS_TONE: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	in_progress: "bg-blue-100 text-blue-800",
	ready: "bg-emerald-100 text-emerald-800",
	delivered: "bg-muted text-muted-foreground",
};

export const PAYMENT_TONE: Record<string, string> = {
	unpaid: "bg-red-100 text-red-800",
	part_payment: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
};

export type OrderStyle = {
	name: string;
	category: string;
	image_url: string | null;
	measurement_template: MeasurementField[] | null;
};

export type Order = {
	id: string;
	code: string;
	status: OrderStatus;
	payment_status: PaymentStatus;
	delivery_date: string | null;
	price: number | null;
	notes: string | null;
	measurement_values: Record<string, string> | null;
	customer_id: string;
	style_id: string | null;
	image_url: string | null;
	created_at: string;
	customers: { name: string; phone: string | null } | null;
	styles: OrderStyle | null;
};

export const ORDER_SELECT =
	"id, code, status, payment_status, delivery_date, price, notes, measurement_values, customer_id, style_id, image_url, created_at, customers(name, phone), styles(name, category, image_url, measurement_template)";

export async function fetchOrders() {
	const { data, error } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as unknown as Order[];
}

export function useOrders() {
	const { user } = useAuth();
	return useQuery({ queryKey: ["orders", user?.id], enabled: !!user, queryFn: fetchOrders });
}

export function useOrder(id: string | undefined) {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["order", id],
		enabled: !!user && !!id,
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id!).maybeSingle();
			if (error) throw error;
			return data as unknown as Order | null;
		},
	});
}

/** The measurement fields a style asks for: its own template, else its category's default. */
export function fieldsForStyle(style: Pick<OrderStyle, "category" | "measurement_template"> | null | undefined): MeasurementField[] {
	if (!style) return [];
	if (style.measurement_template?.length) return style.measurement_template;
	return TEMPLATES[style.category as Category] ?? [];
}

/** "round_sleeve" → "Round sleeve" — for measurements whose label wasn't saved with the style. */
export const humanizeKey = (key: string) => key.replace(/_/g, " ").replace(/^\p{L}/u, (c) => c.toUpperCase());

/** Prices as people type them: "25,000", "₦25000", "25 000". */
export function parseMoney(raw: string): number | null {
	const cleaned = raw.replace(/[\s,₦$£€]/g, "");
	if (!cleaned) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const isOverdue = (o: Pick<Order, "delivery_date" | "status">) =>
	!!o.delivery_date && o.status !== "delivered" && o.delivery_date < todayIso();

export const nextStatus = (status: OrderStatus): OrderStatus | null =>
	ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? null;
