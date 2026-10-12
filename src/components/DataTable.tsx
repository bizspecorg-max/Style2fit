import { cn } from "@/lib/utils";

/**
 * The desktop table.
 *
 * The lists were built as single-column cards for a phone and then stretched
 * across a 1400px desk, which showed three fields where there was room for
 * eight. These pieces are deliberately plain so each module can lay its own
 * columns out; the chrome stays identical between them.
 *
 * Phone layouts keep their cards — this is `hidden md:block`.
 */
export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("hidden overflow-x-auto rounded-md border bg-card md:block", className)}>
			<table className="w-full border-collapse text-sm">{children}</table>
		</div>
	);
}

export function THead({ children }: { children: React.ReactNode }) {
	return <thead className="border-b bg-muted/40">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
	return <tbody className="divide-y">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
	return <tr className={cn("transition-colors hover:bg-muted/30", className)}>{children}</tr>;
}

type CellProps = {
	children?: React.ReactNode;
	className?: string;
	/** Right-aligned and tabular — for counts, money and anything that lines up. */
	numeric?: boolean;
};

export function TH({ children, className, numeric }: CellProps) {
	return (
		<th
			scope="col"
			className={cn(
				"whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
				numeric && "text-right",
				className,
			)}
		>
			{children}
		</th>
	);
}

export function TD({ children, className, numeric }: CellProps) {
	return (
		<td className={cn("px-4 py-3 align-middle", numeric && "text-right tabular-nums", className)}>{children}</td>
	);
}

/** The row-number column — a plain index, so a long list can be talked about. */
export function RowNum({ n }: { n: number }) {
	return <TD numeric className="w-12 text-xs text-muted-foreground">{n}</TD>;
}
