// Countries a shop can be set up in: dial code, currency and the unit tailors
// there usually measure in. Names come from Intl.DisplayNames, so they appear
// in the user's own language.

export type MeasureUnit = "cm" | "in";

export type Country = {
	code: string; // ISO 3166-1 alpha-2
	dial: string; // country calling code, digits only
	currency: string; // ISO 4217
	unit: MeasureUnit;
};

export const COUNTRIES: Country[] = [
	// Africa
	{ code: "NG", dial: "234", currency: "NGN", unit: "in" },
	{ code: "GH", dial: "233", currency: "GHS", unit: "in" },
	{ code: "KE", dial: "254", currency: "KES", unit: "cm" },
	{ code: "ZA", dial: "27", currency: "ZAR", unit: "cm" },
	{ code: "EG", dial: "20", currency: "EGP", unit: "cm" },
	{ code: "MA", dial: "212", currency: "MAD", unit: "cm" },
	{ code: "DZ", dial: "213", currency: "DZD", unit: "cm" },
	{ code: "TN", dial: "216", currency: "TND", unit: "cm" },
	{ code: "SN", dial: "221", currency: "XOF", unit: "cm" },
	{ code: "CI", dial: "225", currency: "XOF", unit: "cm" },
	{ code: "BJ", dial: "229", currency: "XOF", unit: "cm" },
	{ code: "TG", dial: "228", currency: "XOF", unit: "cm" },
	{ code: "BF", dial: "226", currency: "XOF", unit: "cm" },
	{ code: "ML", dial: "223", currency: "XOF", unit: "cm" },
	{ code: "NE", dial: "227", currency: "XOF", unit: "cm" },
	{ code: "CM", dial: "237", currency: "XAF", unit: "cm" },
	{ code: "GA", dial: "241", currency: "XAF", unit: "cm" },
	{ code: "CD", dial: "243", currency: "CDF", unit: "cm" },
	{ code: "AO", dial: "244", currency: "AOA", unit: "cm" },
	{ code: "SL", dial: "232", currency: "SLE", unit: "in" },
	{ code: "LR", dial: "231", currency: "LRD", unit: "in" },
	{ code: "GM", dial: "220", currency: "GMD", unit: "in" },
	{ code: "TZ", dial: "255", currency: "TZS", unit: "cm" },
	{ code: "UG", dial: "256", currency: "UGX", unit: "cm" },
	{ code: "RW", dial: "250", currency: "RWF", unit: "cm" },
	{ code: "ET", dial: "251", currency: "ETB", unit: "cm" },
	{ code: "ZM", dial: "260", currency: "ZMW", unit: "cm" },
	{ code: "ZW", dial: "263", currency: "USD", unit: "cm" },
	{ code: "BW", dial: "267", currency: "BWP", unit: "cm" },
	// Americas
	{ code: "US", dial: "1", currency: "USD", unit: "in" },
	{ code: "CA", dial: "1", currency: "CAD", unit: "in" },
	{ code: "JM", dial: "1876", currency: "JMD", unit: "in" },
	{ code: "TT", dial: "1868", currency: "TTD", unit: "in" },
	{ code: "BR", dial: "55", currency: "BRL", unit: "cm" },
	{ code: "MX", dial: "52", currency: "MXN", unit: "cm" },
	// Europe
	{ code: "GB", dial: "44", currency: "GBP", unit: "in" },
	{ code: "IE", dial: "353", currency: "EUR", unit: "cm" },
	{ code: "FR", dial: "33", currency: "EUR", unit: "cm" },
	{ code: "DE", dial: "49", currency: "EUR", unit: "cm" },
	{ code: "IT", dial: "39", currency: "EUR", unit: "cm" },
	{ code: "ES", dial: "34", currency: "EUR", unit: "cm" },
	{ code: "PT", dial: "351", currency: "EUR", unit: "cm" },
	{ code: "NL", dial: "31", currency: "EUR", unit: "cm" },
	{ code: "BE", dial: "32", currency: "EUR", unit: "cm" },
	{ code: "TR", dial: "90", currency: "TRY", unit: "cm" },
	// Middle East & Asia-Pacific
	{ code: "AE", dial: "971", currency: "AED", unit: "cm" },
	{ code: "SA", dial: "966", currency: "SAR", unit: "cm" },
	{ code: "QA", dial: "974", currency: "QAR", unit: "cm" },
	{ code: "IN", dial: "91", currency: "INR", unit: "in" },
	{ code: "PK", dial: "92", currency: "PKR", unit: "in" },
	{ code: "BD", dial: "880", currency: "BDT", unit: "in" },
	{ code: "PH", dial: "63", currency: "PHP", unit: "in" },
	{ code: "ID", dial: "62", currency: "IDR", unit: "cm" },
	{ code: "MY", dial: "60", currency: "MYR", unit: "cm" },
	{ code: "SG", dial: "65", currency: "SGD", unit: "cm" },
	{ code: "CN", dial: "86", currency: "CNY", unit: "cm" },
	{ code: "JP", dial: "81", currency: "JPY", unit: "cm" },
	{ code: "KR", dial: "82", currency: "KRW", unit: "cm" },
	{ code: "AU", dial: "61", currency: "AUD", unit: "cm" },
	{ code: "NZ", dial: "64", currency: "NZD", unit: "cm" },
];

export const DEFAULT_COUNTRY = "NG";

export const findCountry = (code: string | null | undefined): Country =>
	COUNTRIES.find((c) => c.code === code) ?? COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)!;

export function countryName(code: string, locale = navigator.language): string {
	try {
		return new Intl.DisplayNames([locale, "en"], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}

/** 🇳🇬 from "NG" (regional-indicator letters). */
export const flag = (code: string) =>
	String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

const TIMEZONE_COUNTRY: Record<string, string> = {
	"Africa/Lagos": "NG",
	"Africa/Accra": "GH",
	"Africa/Nairobi": "KE",
	"Africa/Johannesburg": "ZA",
	"Africa/Cairo": "EG",
	"Africa/Casablanca": "MA",
	"Africa/Dakar": "SN",
	"Africa/Abidjan": "CI",
	"Africa/Douala": "CM",
	"Africa/Dar_es_Salaam": "TZ",
	"Africa/Kampala": "UG",
	"Africa/Kigali": "RW",
	"Africa/Addis_Ababa": "ET",
	"Europe/London": "GB",
	"Europe/Paris": "FR",
	"Europe/Berlin": "DE",
	"Asia/Dubai": "AE",
	"Asia/Kolkata": "IN",
	"America/New_York": "US",
	"America/Chicago": "US",
	"America/Los_Angeles": "US",
	"America/Toronto": "CA",
};

/** Best guess of the visitor's country: browser region, then time zone, then Nigeria. */
export function guessCountry(): string {
	const region = navigator.language.split("-")[1]?.toUpperCase();
	if (region && COUNTRIES.some((c) => c.code === region)) return region;
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz];
	} catch {
		// fall through
	}
	return DEFAULT_COUNTRY;
}

// ---------------------------------------------------------------------------
// Phone numbers (stored in international E.164 form, e.g. +2348012345678)
// ---------------------------------------------------------------------------

/** "0801 234 5678" + NG → "+2348012345678". Returns null if it can't be a real number. */
export function toE164(countryCode: string, national: string): string | null {
	const digits = national.replace(/\D/g, "").replace(/^0+/, "");
	const { dial } = findCountry(countryCode);
	const full = dial + digits;
	if (digits.length < 6 || full.length < 8 || full.length > 15) return null;
	return `+${full}`;
}

/** Splits "+2348012345678" into its country and national part for editing. */
export function fromE164(value: string | null | undefined, fallbackCountry = DEFAULT_COUNTRY) {
	const digits = (value ?? "").replace(/\D/g, "");
	if (!value?.trim().startsWith("+") || !digits) {
		// Old local numbers such as "08012345678" are kept as typed.
		return { country: fallbackCountry, national: value ?? "" };
	}
	const match = [...COUNTRIES]
		.sort((a, b) => b.dial.length - a.dial.length)
		.find((c) => digits.startsWith(c.dial));
	return match
		? { country: match.code, national: digits.slice(match.dial.length) }
		: { country: fallbackCountry, national: digits };
}
