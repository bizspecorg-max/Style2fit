import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { COUNTRIES, countryName, flag } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
	id: string;
	country: string;
	national: string;
	onCountryChange: (code: string) => void;
	onNationalChange: (value: string) => void;
	invalid?: boolean;
	describedBy?: string;
};

/** Country calling code + local number. Pair with toE164() to save. */
export function PhoneInput({ id, country, national, onCountryChange, onNationalChange, invalid, describedBy }: Props) {
	const { t, i18n } = useTranslation();
	const options = useMemo(
		() =>
			COUNTRIES.map((c) => ({ ...c, name: countryName(c.code, i18n.language) })).sort((a, b) =>
				a.name.localeCompare(b.name, i18n.language)
			),
		[i18n.language]
	);
	const current = options.find((c) => c.code === country);

	return (
		<div className="flex gap-2">
			<label className="sr-only" htmlFor={`${id}-country`}>
				{t("phone.countryCode")}
			</label>
			<div className="relative">
				<select
					id={`${id}-country`}
					value={country}
					onChange={(e) => onCountryChange(e.target.value)}
					className="h-12 w-[6.75rem] appearance-none rounded-md border border-input bg-background pl-3 pr-7 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{options.map((c) => (
						<option key={c.code} value={c.code}>
							{flag(c.code)} {c.name} (+{c.dial})
						</option>
					))}
				</select>
				{/* The closed select shows only the flag and code; the list shows full names. */}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-px left-px right-6 flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-l-md bg-background pl-3 text-base"
				>
					{current && `${flag(current.code)} +${current.dial}`}
				</span>
				<span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
					▾
				</span>
			</div>
			<Input
				id={id}
				type="tel"
				inputMode="tel"
				autoComplete="tel-national"
				placeholder={t("phone.placeholder")}
				value={national}
				onChange={(e) => onNationalChange(e.target.value)}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				className={cn("h-12 flex-1", invalid && "border-destructive")}
			/>
		</div>
	);
}
