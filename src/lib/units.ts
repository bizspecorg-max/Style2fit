import type { MeasureUnit } from "@/lib/countries";

export type { MeasureUnit };

const CM_PER_INCH = 2.54;

/** Accepts what older records stored ("inches", "in", "cm", "centimetres"). */
export function normalizeUnit(unit: string | null | undefined): MeasureUnit | null {
	if (!unit) return null;
	const u = unit.trim().toLowerCase();
	if (u === '"' || u.startsWith("in")) return "in";
	if (u.startsWith("cm") || u.startsWith("cent")) return "cm";
	return null;
}

export function convert(value: number, from: MeasureUnit, to: MeasureUnit): number {
	if (from === to) return value;
	return from === "in" ? value * CM_PER_INCH : value / CM_PER_INCH;
}

/** "36,5" or "36.5" → 36.5; anything that isn't a number → null. */
export function parseMeasure(raw: string | number | null | undefined): number | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
	const value = Number(raw.trim().replace(",", "."));
	return raw.trim() !== "" && Number.isFinite(value) ? value : null;
}

/**
 * A stored value shown in the viewer's unit, e.g. 36 (in) → "91.4 cm".
 * Non-numeric notes such as "loose" are shown as typed.
 */
export function formatMeasure(
	raw: string | number | null | undefined,
	from: MeasureUnit,
	to: MeasureUnit,
	locale: string
): string {
	const value = parseMeasure(raw);
	if (value === null) return typeof raw === "string" && raw.trim() ? raw.trim() : "—";
	const shown = convert(value, from, to);
	const number = new Intl.NumberFormat(locale, { maximumFractionDigits: to === "in" ? 2 : 1 }).format(shown);
	return `${number} ${to}`;
}

/** For pre-filling an input when the unit changes: rounded, dot decimal. */
export function convertInput(raw: string, from: MeasureUnit, to: MeasureUnit): string {
	const value = parseMeasure(raw);
	if (value === null) return raw;
	const shown = convert(value, from, to);
	return String(Math.round(shown * (to === "in" ? 100 : 10)) / (to === "in" ? 100 : 10));
}
