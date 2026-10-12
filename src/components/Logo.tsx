import { cn } from "@/lib/utils";

type Props = {
	/** The background it sits on: "light" (ivory, white) or "dark" (emerald, black, photos). */
	on?: "dark" | "light";
	className?: string;
	size?: "sm" | "md" | "lg";
};

const TEXT = { sm: "text-base", md: "text-xl", lg: "text-3xl" };

/**
 * The wordmark — set text, nothing else.
 *
 * There was a drawn mark here (a gold tape-measure S on a tile). It was read as
 * childish twice, so it is gone rather than redrawn a third time. A fashion
 * house signs its name; it does not need a badge in front of it.
 */
export function Logo({ on = "light", className, size = "md" }: Props) {
	return (
		<span
			className={cn(
				"font-display font-semibold leading-none tracking-[0.005em] self-start",
				TEXT[size],
				on === "dark" ? "text-[#F7F3E9]" : "text-foreground",
				className,
			)}
		>
			Style2Fit
		</span>
	);
}
