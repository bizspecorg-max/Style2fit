// Drop-in replacement for ./dialog: a centred dialog on desktop, a bottom sheet on phones.
import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as D from "@/components/ui/dialog";
import * as V from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const MobileContext = React.createContext(false);

type RootProps = { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode };

export function Dialog({ children, ...props }: RootProps) {
	const isMobile = useIsMobile();
	return (
		<MobileContext.Provider value={isMobile}>
			{isMobile ? <V.Drawer {...props}>{children}</V.Drawer> : <D.Dialog {...props}>{children}</D.Dialog>}
		</MobileContext.Provider>
	);
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
	const mobile = React.useContext(MobileContext);
	if (!mobile) return <D.DialogContent className={cn("rounded-3xl", className)}>{children}</D.DialogContent>;
	return (
		<V.DrawerContent className="max-h-[94dvh] rounded-t-3xl">
			<div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2">{children}</div>
		</V.DrawerContent>
	);
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	const mobile = React.useContext(MobileContext);
	return mobile ? <V.DrawerHeader className={cn("px-0 pb-4 text-left", className)} {...props} /> : <D.DialogHeader className={className} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	const mobile = React.useContext(MobileContext);
	if (!mobile) return <D.DialogFooter className={className} {...props} />;
	// Sticks to the bottom of the sheet so the main button is always within thumb reach.
	return (
		<div
			className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-2 border-t bg-background px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 [&>*]:h-12 [&>*]:w-full [&>*]:rounded-full"
			{...props}
		/>
	);
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
	const mobile = React.useContext(MobileContext);
	return mobile ? <V.DrawerTitle className={cn("font-display text-2xl", className)} {...props} /> : <D.DialogTitle className={cn("font-display text-2xl", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	const mobile = React.useContext(MobileContext);
	return mobile ? <V.DrawerDescription className={className} {...props} /> : <D.DialogDescription className={className} {...props} />;
}
