import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/PhoneInput";
import { COUNTRIES, countryName, findCountry, flag, type MeasureUnit } from "@/lib/countries";
import { cn } from "@/lib/utils";

export type ShopState = {
	businessName: string;
	country: string;
	national: string;
	unit: MeasureUnit;
};

export type ShopErrors = Partial<Record<"businessName" | "phone", string>>;

/** Drops the error of any field the user just edited. */
export function clearChangedShopErrors(errors: ShopErrors, prev: ShopState, next: ShopState): ShopErrors {
	return {
		businessName: next.businessName !== prev.businessName ? undefined : errors.businessName,
		phone: next.national !== prev.national || next.country !== prev.country ? undefined : errors.phone,
	};
}

/** Business name, country, phone and measuring unit — used by sign-up and onboarding. */
export function ShopFields({
	value,
	onChange,
	errors = {},
}: {
	value: ShopState;
	onChange: (next: ShopState) => void;
	errors?: ShopErrors;
}) {
	const { t, i18n } = useTranslation();
	const countries = useMemo(
		() =>
			COUNTRIES.map((c) => ({ ...c, name: countryName(c.code, i18n.language) })).sort((a, b) =>
				a.name.localeCompare(b.name, i18n.language)
			),
		[i18n.language]
	);
	const currency = findCountry(value.country).currency;

	return (
		<div className="space-y-5">
			<div className="space-y-1.5">
				<Label htmlFor="businessName">{t("signup.businessName")}</Label>
				<Input
					id="businessName"
					autoComplete="organization"
					placeholder={t("signup.businessPlaceholder")}
					value={value.businessName}
					onChange={(e) => onChange({ ...value, businessName: e.target.value })}
					aria-invalid={!!errors.businessName || undefined}
					aria-describedby={errors.businessName ? "businessName-error" : undefined}
					className="h-12"
				/>
				{errors.businessName && (
					<p id="businessName-error" className="text-sm text-destructive">
						{errors.businessName}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="country">{t("signup.country")}</Label>
				<select
					id="country"
					autoComplete="country"
					value={value.country}
					// Changing country also picks that country's usual unit (still editable below).
					onChange={(e) => onChange({ ...value, country: e.target.value, unit: findCountry(e.target.value).unit })}
					className="h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{countries.map((c) => (
						<option key={c.code} value={c.code}>
							{flag(c.code)} {c.name}
						</option>
					))}
				</select>
				<p className="text-xs text-muted-foreground">{t("signup.currency", { currency })}</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="phone">{t("signup.phone")}</Label>
				<PhoneInput
					id="phone"
					country={value.country}
					national={value.national}
					onCountryChange={(country) => onChange({ ...value, country })}
					onNationalChange={(national) => onChange({ ...value, national })}
					invalid={!!errors.phone}
					describedBy="phone-help"
				/>
				<p id="phone-help" className={cn("text-xs", errors.phone ? "text-destructive" : "text-muted-foreground")}>
					{errors.phone ?? t("signup.phoneHint")}
				</p>
			</div>

			<fieldset className="space-y-1.5">
				<legend className="text-sm font-medium">{t("signup.unit")}</legend>
				<div className="grid grid-cols-2 gap-2" role="radiogroup">
					{(["cm", "in"] as const).map((unit) => (
						<label
							key={unit}
							className={cn(
								"flex h-12 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors",
								"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
								value.unit === unit
									? "border-primary bg-primary text-primary-foreground"
									: "border-input bg-background hover:bg-muted"
							)}
						>
							<input
								type="radio"
								name="unit"
								value={unit}
								checked={value.unit === unit}
								onChange={() => onChange({ ...value, unit })}
								className="sr-only"
							/>
							{t(unit === "cm" ? "signup.unitCm" : "signup.unitIn")}
						</label>
					))}
				</div>
			</fieldset>
		</div>
	);
}
