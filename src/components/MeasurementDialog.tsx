import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, TEMPLATES, newField } from "@/lib/measurementTemplates";
import { formatDate, useShop } from "@/lib/shop";
import { convertInput, normalizeUnit, parseMeasure, type MeasureUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

/** A measurement as stored in the `measurements` table. */
export type MeasurementRecord = {
	id: string;
	title: string;
	fields: { key: string; label: string; unit?: string }[];
	values: Record<string, string>;
	created_at: string;
};

type Row = { key: string; label: string; value: string };

const LAST = "__last__";
const BLANK = "__blank__";

/** Record a new set of measurements for one customer, in cm or inches. */
export function MeasurementDialog({
	open,
	onOpenChange,
	customerId,
	last,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customerId: string;
	/** Most recent measurement, offered as a starting point. */
	last?: MeasurementRecord | null;
	onSaved: () => void;
}) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const [start, setStart] = useState<string>(BLANK);
	const [title, setTitle] = useState("");
	const [unit, setUnit] = useState<MeasureUnit>(shop.unit);
	const [rows, setRows] = useState<Row[]>([]);
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	// Same regional format as the dates shown on measurement cards.
	const today = formatDate(new Date().toISOString(), shop.locale);

	const applyStart = (choice: string, toUnit: MeasureUnit) => {
		setStart(choice);
		if (choice === LAST && last) {
			const from = normalizeUnit(last.fields[0]?.unit) ?? shop.unit;
			setTitle(last.title);
			setRows(last.fields.map((f) => ({ key: f.key, label: f.label, value: convertInput(last.values[f.key] ?? "", normalizeUnit(f.unit) ?? from, toUnit) })));
		} else if (choice !== BLANK && choice in TEMPLATES) {
			setTitle(`${choice} · ${today}`);
			setRows(TEMPLATES[choice as keyof typeof TEMPLATES].map((f) => ({ ...f, value: "" })));
		} else {
			setTitle(`${t("measure.defaultTitle")} · ${today}`);
			setRows(["Chest", "Waist", "Hip", "Length"].map((label) => ({ ...newField(label), value: "" })));
		}
	};

	useEffect(() => {
		if (!open) return;
		setUnit(shop.unit);
		setError(undefined);
		applyStart(last ? LAST : BLANK, shop.unit);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const switchUnit = (next: MeasureUnit) => {
		if (next === unit) return;
		setRows((current) => current.map((r) => ({ ...r, value: convertInput(r.value, unit, next) })));
		setUnit(next);
	};

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		const filled = rows.filter((r) => r.label.trim());
		if (!title.trim()) return setError(t("measure.errors.titleRequired"));
		if (!filled.some((r) => parseMeasure(r.value) !== null)) return setError(t("measure.errors.valueRequired"));
		const bad = filled.find((r) => r.value.trim() && (parseMeasure(r.value) === null || parseMeasure(r.value)! <= 0));
		if (bad) return setError(t("measure.errors.notNumber", { label: bad.label }));
		if (!user) return;

		setSaving(true);
		const { error: saveError } = await supabase.from("measurements").insert({
			user_id: user.id,
			customer_id: customerId,
			title: title.trim(),
			// Same shape as before, with the unit on every field so it can be shown in cm or inches.
			fields: filled.map((r) => ({ key: r.key, label: r.label.trim(), unit })),
			values: Object.fromEntries(filled.filter((r) => r.value.trim()).map((r) => [r.key, String(parseMeasure(r.value))])),
		});
		setSaving(false);
		if (saveError) return setError(saveError.message);
		toast.success(t("measure.saved"));
		onOpenChange(false);
		onSaved();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("measure.newTitle")}</DialogTitle>
					<DialogDescription>{t("measure.newHint")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={save} noValidate className="space-y-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="measure-start">{t("measure.startFrom")}</Label>
							<select
								id="measure-start"
								value={start}
								onChange={(e) => applyStart(e.target.value, unit)}
								className="h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
							>
								{last && <option value={LAST}>{t("measure.startLast")}</option>}
								<option value={BLANK}>{t("measure.startBlank")}</option>
								<optgroup label={t("measure.templates")}>
									{CATEGORIES.filter((c) => c !== "Other").map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</optgroup>
							</select>
						</div>
						<fieldset className="space-y-1.5">
							<legend className="text-sm font-medium">{t("measure.unit")}</legend>
							<div className="grid h-11 grid-cols-2 rounded-md border border-input p-1" role="radiogroup">
								{(["cm", "in"] as const).map((u) => (
									<label
										key={u}
										className={cn(
											"flex cursor-pointer items-center justify-center rounded text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
										)}
									>
										<input type="radio" name="measure-unit" value={u} checked={unit === u} onChange={() => switchUnit(u)} className="sr-only" />
										{u}
									</label>
								))}
							</div>
						</fieldset>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="measure-title">{t("measure.title")}</Label>
						<Input id="measure-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
					</div>

					<fieldset className="space-y-2">
						<legend className="mb-1 text-sm font-medium">{t("measure.values")}</legend>
						{rows.map((row, i) => (
							<div key={row.key} className="grid grid-cols-[1fr_7.5rem_2.5rem] items-center gap-2">
								<Input
									aria-label={t("measure.fieldName", { n: i + 1 })}
									placeholder={t("measure.fieldPlaceholder")}
									value={row.label}
									onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
									className="h-11"
								/>
								<div className="relative">
									<Input
										aria-label={t("measure.fieldValue", { label: row.label || i + 1, unit })}
										inputMode="decimal"
										value={row.value}
										onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
										className="h-11 pr-9 text-right tabular-nums"
									/>
									<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-11 w-10"
									aria-label={t("measure.removeField", { label: row.label || i + 1 })}
									onClick={() => setRows(rows.filter((_, j) => j !== i))}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
						<Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setRows([...rows, { ...newField(""), value: "" }])}>
							<Plus className="h-4 w-4" />
							{t("measure.addField")}
						</Button>
					</fieldset>

					{error && (
						<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" className="h-11" disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{t("measure.save")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
