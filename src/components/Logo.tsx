import { useId } from "react";
import { cn } from "@/lib/utils";

const S_PATH = "M43 21c-2.4-3.2-6.4-5-11-5-6.6 0-11 3.6-11 8.6 0 11.2 23 6 23 17.8 0 5.2-4.8 8.6-11.8 8.6-5 0-9.2-2-11.8-5.6";

/** The Style2Fit mark — a gold tape measure curling into an S on an emerald tile. Same artwork as /favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
	const id = useId().replace(/:/g, "");
	return (
		<svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden focusable="false">
			<defs>
				<linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#17603f" />
					<stop offset="1" stopColor="#0b3526" />
				</linearGradient>
				<linearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#f0d38a" />
					<stop offset="1" stopColor="#b98a3c" />
				</linearGradient>
			</defs>
			<rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
			<rect x="1.25" y="1.25" width="61.5" height="61.5" rx="13.75" fill="none" stroke="#e7c77e" strokeOpacity=".28" strokeWidth="1.2" />
			<path d={S_PATH} fill="none" stroke={`url(#${id}gold)`} strokeWidth="6.6" strokeLinecap="round" />
			<path d={S_PATH} fill="none" stroke="#0b3526" strokeOpacity=".55" strokeWidth="6.6" strokeDasharray="1.1 4.4" strokeDashoffset="-3" />
		</svg>
	);
}

type Props = {
	/** The background it sits on: "light" (ivory, white) or "dark" (emerald, black, photos). */
	on?: "dark" | "light";
	className?: string;
	size?: "sm" | "md" | "lg";
};

const MARK = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" };
const TEXT = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

/** Mark + wordmark. Vector, so it stays sharp at any size and on any screen. */
export function Logo({ on = "light", className, size = "md" }: Props) {
	return (
		<span className={cn("inline-flex items-center gap-2.5 self-start", className)} aria-label="Style2Fit" role="img">
			<LogoMark className={MARK[size]} />
			<span aria-hidden className={cn("font-display font-semibold leading-none tracking-tight", TEXT[size], on === "dark" ? "text-[#f6f1e4]" : "text-foreground")}>
				Style<span className={on === "dark" ? "text-[#e7c77e]" : "text-accent"}>2</span>Fit
			</span>
		</span>
	);
}
