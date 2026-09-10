import { useAuth } from "@/contexts/AuthContext";
import { findCountry } from "@/lib/countries";
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

/** wa.me link for an international number; without a number, WhatsApp lets you pick the chat. */
export function whatsappLink(phone: string | null | undefined, text?: string): string {
	const digits = phone?.trim().startsWith("+") ? phone.replace(/\D/g, "") : "";
	const query = text ? `?text=${encodeURIComponent(text)}` : "";
	return `https://wa.me/${digits}${query}`;
}
