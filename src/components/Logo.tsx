import { cn } from "@/lib/utils";

// Served by Cloudinary trimmed and resized (≈7 KB) instead of the 751 KB original.
const CLOUD = "https://res.cloudinary.com/dfmigbgri/image/upload";
const ASSET = "v1778103874/Stlye_2fit_rxojiu.png";
/** Full logo — gold mark + white wordmark. Only for dark backgrounds. */
export const LOGO_FULL_URL = `${CLOUD}/e_trim/h_96,f_auto,q_auto/${ASSET}`;
/** Just the gold S2F mark. Works on any background. */
export const LOGO_MARK_URL = `${CLOUD}/c_crop,x_300,y_620,w_1780,h_1080/e_trim/h_96,f_auto,q_auto/${ASSET}`;

type Props = {
	/** "dark" = placed on a dark background (full logo); "light" = mark + wordmark text. */
	on?: "dark" | "light";
	className?: string;
	size?: "sm" | "md" | "lg";
};

const HEIGHT = { sm: "h-7", md: "h-9", lg: "h-12" };

export function Logo({ on = "light", className, size = "md" }: Props) {
	if (on === "dark") {
		// self-start: stay left-aligned (and natural width) inside flex columns.
		return (
			<img
				src={LOGO_FULL_URL}
				alt="Style2Fit"
				className={cn(HEIGHT[size], "w-auto max-w-full self-start object-contain object-left", className)}
			/>
		);
	}
	return (
		<span className={cn("inline-flex items-center gap-2 self-start", className)}>
			<img src={LOGO_MARK_URL} alt="" aria-hidden className={cn(HEIGHT[size], "w-auto object-contain")} />
			<span className="font-display text-xl font-bold tracking-tight text-foreground">
				Style<span className="text-accent">2</span>Fit
			</span>
		</span>
	);
}
