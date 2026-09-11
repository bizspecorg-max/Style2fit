// Small building blocks shared by every screen, so lists and headers feel like one product.
import { cn } from "@/lib/utils";
import { initials } from "@/lib/shop";

const TONE_VAR: Record<string, string> = {
	pending: "st-pending",
	in_progress: "st-progress",
	ready: "st-ready",
	delivered: "st-delivered",
	overdue: "st-overdue",
	unpaid: "st-unpaid",
	part_payment: "st-part",
	paid: "st-paid",
};

/** Jewel-tone pill with a dot — for order and payment status. */
export function StatusPill({ tone, children, className }: { tone: string; children: React.ReactNode; className?: string }) {
	const v = TONE_VAR[tone] ?? "st-delivered";
	return (
		<span
			className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
			style={{ color: `hsl(var(--${v}))`, backgroundColor: `hsl(var(--${v}) / 0.1)` }}
		>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{children}
		</span>
	);
}

const HUES = [158, 214, 280, 350, 34, 190];

/** Initials on a soft colour that's always the same for the same name. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	const hue = HUES[hash % HUES.length];
	const dims = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg" }[size];
	return (
		<span
			aria-hidden
			className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide", dims, className)}
			style={{ backgroundColor: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 55% 26%)` }}
		>
			{initials(name)}
		</span>
	);
}

export function EmptyState({
	icon: Icon,
	title,
	body,
	action,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	body: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
			<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-card">
				<Icon className="h-6 w-6" aria-hidden />
			</span>
			<h2 className="mt-5 font-display text-2xl">{title}</h2>
			<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
}

export function PageHeader({
	eyebrow,
	title,
	subtitle,
	actions,
}: {
	eyebrow?: string;
	title: string;
	subtitle?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				{eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
				<h1 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
				{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
			</div>
			{actions && <div className="flex shrink-0 gap-2">{actions}</div>}
		</header>
	);
}

/** Main actions pinned above the phone tab bar, within thumb reach. Desktop shows them inline instead. */
export function MobileActionBar({ children }: { children: React.ReactNode }) {
	return (
		<>
			<div className="h-16 md:hidden" aria-hidden />
			<div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden print:hidden">
				<div className="mx-auto flex max-w-lg gap-2">{children}</div>
			</div>
		</>
	);
}

export function SectionTitle({ children, count, action }: { children: React.ReactNode; count?: number; action?: React.ReactNode }) {
	return (
		<div className="mb-3 flex items-center justify-between gap-2">
			<h2 className="eyebrow flex items-center gap-2">
				{children}
				{count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tracking-normal text-muted-foreground">{count}</span>}
			</h2>
			{action}
		</div>
	);
}
