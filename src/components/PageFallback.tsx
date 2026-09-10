import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown for the split second while a screen's code downloads. */
export function PageFallback({ fullScreen = false }: { fullScreen?: boolean }) {
	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn("flex items-center justify-center", fullScreen ? "min-h-dvh bg-background" : "py-24")}
		>
			<Loader2 className="h-6 w-6 animate-spin text-primary" />
		</div>
	);
}
