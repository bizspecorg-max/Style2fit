import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DueDateChips } from "@/components/DueDateChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { fieldsForStyle, humanizeKey, parseMoney, type Order } from "@/lib/orders";
import { useShop } from "@/lib/shop";
import { parseMeasure } from "@/lib/units";

/** Change an order after it was created: price, pickup date, notes and measurements. */
export function EditOrderDialog({ open, onOpenChange, order, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; order: Order; onSaved: () => void }) {
	const { t } = useTranslation();
	const shop = useShop();
	const [price, setPrice] = useState("");
	const [date, setDate] = useState("");
	const [notes, setNotes] = useState("");
	const [values, setValues] = useState<Record<string, string>>({});
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setPrice(order.price != null ? order.price.toLocaleString(shop.locale) : "");
		setDate(order.delivery_date ?? "");
		setNotes(order.notes ?? "");
		setValues({ ...(order.measurement_values ?? {}) });
		setError(undefined);
	}, [open, order, shop.locale]);

	const template = fieldsForStyle(order.styles);
	const fields = [
		...template,
		...Object.keys(order.measurement_values ?? {})
			.filter((k) => !template.some((f) => f.key === k))
			.map((k) => ({ key: k, label: humanizeKey(k) })),
	];

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		const amount = price.trim() ? parseMoney(price) : null;
		if (price.trim() && (amount === null || amount < 0)) return setError(t("orders.new.errors.price"));
		const bad = fields.find((f) => values[f.key]?.trim() && parseMeasure(values[f.key]) === null);
		if (bad) return setError(t("measure.errors.notNumber", { label: bad.label }));
		setSaving(true);
		const measurement_values = Object.fromEntries(
			Object.entries(values)
				.filter(([, v]) => v?.trim())
				.map(([k, v]) => [k, String(parseMeasure(v) ?? v.trim())])
		);
		const { error: updateError } = await supabase
			.from("orders")
			.update({ price: amount, delivery_date: date || null, notes: notes.trim() || null, measurement_values })
			.eq("id", order.id);
		setSaving(false);
		if (updateError) return setError(updateError.message);
		toast.success(t("orders.detail.updated"));
		onOpenChange(false);
		onSaved();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("orders.edit.title")}</DialogTitle>
					<DialogDescription>{t("orders.edit.hint")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={save} noValidate className="space-y-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="edit-price">{t("orders.new.price", { currency: shop.currency })}</Label>
							<Input id="edit-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-12 font-display text-lg tabular-nums" />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-date">{t("orders.new.deliveryDate")}</Label>
							<Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
						</div>
					</div>
					<DueDateChips value={date} onChange={setDate} />
					<div className="space-y-1.5">
						<Label htmlFor="edit-notes">{t("customers.notesOptional")}</Label>
						<Textarea id="edit-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
					</div>
					{fields.length > 0 && (
						<fieldset className="space-y-2">
							<legend className="text-sm font-medium">{t("orders.edit.measurements")}</legend>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{fields.map((f) => (
									<div key={f.key} className="space-y-1 rounded-2xl bg-muted/50 p-2.5">
										<Label htmlFor={`edit-m-${f.key}`} className="block truncate text-xs text-muted-foreground">
											{f.label}
										</Label>
										<div className="relative">
											<Input
												id={`edit-m-${f.key}`}
												inputMode="decimal"
												value={values[f.key] ?? ""}
												onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
												className="h-11 bg-card pr-8 text-right tabular-nums"
											/>
											<span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{shop.unit}</span>
										</div>
									</div>
								))}
							</div>
						</fieldset>
					)}
					{error && (
						<p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" className="rounded-full" disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{t("common.save")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
