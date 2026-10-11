import { cn } from "@/lib/utils";

/* A monogram in a garment label, with one graduated edge — the tailoring cue
   lives on the frame, not on the letter. The previous mark drew the S as a fat
   round-capped tape with full-width ticks, which at any size read as a
   caterpillar; three variants were rendered at 160/36/16px before this one. */
const S_PATH = "M43 21c-2.4-3.2-6.4-5-11-5-6.6 0-11 3.6-11 8.6 0 11.2 23 6 23 17.8 0 5.2-4.8 8.6-11.8 8.6-5 0-9.2-2-11.8-5.6";
const TICKS = "M8 3v4M14 3v2.5M20 3v4M26 3v2.5M32 3v4M38 3v2.5M44 3v4M50 3v2.5M56 3v4";

const INK = "#0C3D2B";
const BRASS = "#DDB96C";

/** The Style2Fit mark. Same artwork as /favicon.svg — change both together. */
export function LogoMark({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden focusable="false">
			{/* Flat and near-square: a woven label, not a phone icon. */}
			<rect width="64" height="64" rx="4" fill={INK} />
			<rect x="3" y="3" width="58" height="58" rx="2" fill="none" stroke={BRASS} strokeOpacity=".34" strokeWidth=".9" />
			<path d={TICKS} stroke={BRASS} strokeOpacity=".5" strokeWidth="1" />
			{/* Butt caps: the terminals are cut square, the way a didone sits flat. */}
			<path d={S_PATH} fill="none" stroke={BRASS} strokeWidth="5.2" strokeLinecap="butt" />
		</svg>
	);
}

type Props = {
	/** The background it sits on: "light" (ivory, white) or "dark" (emerald, black, photos). */
	on?: "dark" | "light";
	className?: string;
	size?: "sm" | "md" | "lg";
};

const MARK = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
const TEXT = { sm: "text-base", md: "text-xl", lg: "text-3xl" };

/** Mark + wordmark. Vector, so it stays sharp at any size and on any screen. */
export function Logo({ on = "light", className, size = "md" }: Props) {
	return (
		<span className={cn("inline-flex items-center gap-2.5 self-start", className)} aria-label="Style2Fit" role="img">
			<LogoMark className={MARK[size]} />
			{/* A didone needs air — tightening it the way a grotesk likes closes the thin strokes up. */}
			<span
				aria-hidden
				className={cn(
					"font-display font-semibold leading-none tracking-[0.005em]",
					TEXT[size],
					on === "dark" ? "text-[#F7F3E9]" : "text-foreground",
				)}
			>
				Style<span className={on === "dark" ? "text-accent-bright" : "text-accent"}>2</span>Fit
			</span>
		</span>
	);
}
