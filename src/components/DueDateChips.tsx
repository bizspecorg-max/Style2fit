import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** "2026-09-18" in the device's own time zone (toISOString would use UTC and can be a day off). */
export const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const OPTIONS = [
	[7, "week"],
	[14, "twoWeeks"],
	[30, "month"],
] as const;

/** One-tap pickup dates for the usual turnaround times. */
export function DueDateChips({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap gap-1.5" role="group" aria-label={t("orders.flow.pickupDate")}>
			{OPTIONS.map(([days, key]) => {
				const d = new Date();
				d.setDate(d.getDate() + days);
				const iso = localIso(d);
				return (
					<button
						key={key}
						type="button"
						aria-pressed={value === iso}
						onClick={() => onChange(iso)}
						className={cn(
							"h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							value === iso ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"
						)}
					>
						{t(`orders.flow.dueIn.${key}`)}
					</button>
				);
			})}
		</div>
	);
}
