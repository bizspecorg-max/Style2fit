import { MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	/** Where it goes, for navigation. */
	to?: string;
	/** An external link — opens in a new tab. */
	href?: string;
	onSelect?: () => void;
	/** Red, and set below a divider. For anything that destroys something. */
	danger?: boolean;
};

/**
 * The three-dot menu at the end of a table row.
 *
 * A row can offer six useful things — open, edit, new order, message, share,
 * delete — and six buttons per row would drown the data. They live in here so
 * the table stays readable and destructive actions take a deliberate look.
 */
export function RowActions({ actions, label }: { actions: RowAction[]; label: string }) {
	const items = actions.filter(Boolean);
	if (!items.length) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={label}
				onClick={(e) => e.stopPropagation()}
				className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
			>
				<MoreHorizontal className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{items.map((a, i) => {
					const firstDanger = a.danger && !items[i - 1]?.danger;
					const body = (
						<>
							{a.icon && <a.icon className="mr-2 h-4 w-4" />}
							{a.label}
						</>
					);
					return (
						<div key={a.label}>
							{firstDanger && i > 0 && <DropdownMenuSeparator />}
							<DropdownMenuItem
								onSelect={a.onSelect}
								asChild={!!(a.to || a.href)}
								className={cn(a.danger && "text-destructive focus:text-destructive")}
							>
								{a.to ? (
									<Link to={a.to}>{body}</Link>
								) : a.href ? (
									<a href={a.href} target="_blank" rel="noreferrer">
										{body}
									</a>
								) : (
									<span className="flex items-center">{body}</span>
								)}
							</DropdownMenuItem>
						</div>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
