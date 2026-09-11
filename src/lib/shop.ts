import { useAuth } from "@/contexts/AuthContext";
import { findCountry, fromE164 } from "@/lib/countries";
import type { MeasureUnit } from "@/lib/countries";

export type Shop = {
	country: string;
	currency: string;
	unit: MeasureUnit;
	locale: string;
};

/** The signed-in shop's country, currency and unit (saved on the auth profile at sign-up / onboarding). */
export function useShop(): Shop {
	const { user } = useAuth();
	const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
	const country = findCountry(typeof meta.country === "string" ? meta.country : null);
	const unit = meta.unit === "cm" || meta.unit === "in" ? meta.unit : country.unit;
	return {
		country: country.code,
		currency: typeof meta.currency === "string" ? meta.currency : country.currency,
		unit,
		locale: navigator.language || "en",
	};
}

export function formatMoney(amount: number | null | undefined, currency: string, locale: string): string {
	if (amount === null || amount === undefined) return "—";
	try {
		return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${currency} ${amount.toLocaleString(locale)}`;
	}
}

export function formatDate(iso: string | null | undefined, locale: string): string {
	if (!iso) return "—";
	// "2026-09-10" is a calendar day. Timestamps without a zone come from UTC database
	// columns, so read them as UTC — otherwise times near midnight show the wrong day.
	const normalized = iso.length === 10 ? `${iso}T00:00:00` : /(z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`;
	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

/** "Ada Obi" → "AO". Only words that start with a letter count, so "TEST – Ada" → "TA". */
export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter((w) => /^\p{L}/u.test(w))
		.slice(0, 2)
		.map((w) => w[0].toLocaleUpperCase())
		.join("") || "?";

/** "+2348031234501" → "+234 803 123 4501". Numbers not in international form are shown as typed. */
export function formatPhone(phone: string | null | undefined): string {
	if (!phone) return "";
	if (!phone.trim().startsWith("+")) return phone;
	const { country, national } = fromE164(phone);
	const dial = findCountry(country).dial;
	const groups = national.length >= 9 && national.length <= 10 ? [national.slice(0, 3), national.slice(3, 6), national.slice(6)] : national.match(/.{1,3}/g) ?? [national];
	return `+${dial} ${groups.join(" ")}`;
}

/** "STF-260910-e1cfa1" → "#E1CFA1" — the part people actually read out. */
export const shortCode = (code: string) => `#${(code.split("-").pop() ?? code).toUpperCase()}`;

/** Whole days from today to a calendar date ("2026-09-14"); negative when it's past. */
export function daysUntil(dateIso: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.round((new Date(`${dateIso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

/** wa.me link for an international number; without a number, WhatsApp lets you pick the chat. */
export function whatsappLink(phone: string | null | undefined, text?: string): string {
	const digits = phone?.trim().startsWith("+") ? phone.replace(/\D/g, "") : "";
	const query = text ? `?text=${encodeURIComponent(text)}` : "";
	return `https://wa.me/${digits}${query}`;
}
