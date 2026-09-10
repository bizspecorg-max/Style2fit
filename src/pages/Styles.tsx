import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Plus, Ruler, Search, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StyleDialog } from "@/components/StyleDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fieldsForStyle } from "@/lib/orders";
import { useStyles, type StyleRow } from "@/lib/styles";
import { cn } from "@/lib/utils";

const Styles = () => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: styles = [], isLoading, isError, refetch } = useStyles();
	const [q, setQ] = useState("");
	const [category, setCategory] = useState("all");
	const [dialog, setDialog] = useState<{ open: boolean; style: StyleRow | null }>({ open: false, style: null });
	const [deleting, setDeleting] = useState<StyleRow | null>(null);

	useEffect(() => {
		document.title = `${t("nav.styles")} · Style2Fit`;
	}, [t]);

	const categories = useMemo(() => [...new Set(styles.map((s) => s.category))].sort(), [styles]);
	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		return styles.filter((st) => (category === "all" || st.category === category) && (!s || st.name.toLowerCase().includes(s)));
	}, [styles, q, category]);

	const refresh = () => queryClient.invalidateQueries({ queryKey: ["styles"] });

	const remove = async () => {
		if (!deleting) return;
		const { error } = await supabase.from("styles").delete().eq("id", deleting.id);
		setDeleting(null);
		if (error) return toast.error(error.code === "23503" ? t("styles.inUse") : error.message);
		toast.success(t("styles.deleted"));
		refresh();
	};

	return (
		<div className="space-y-5">
			<header className="flex items-end justify-between gap-3">
				<div>
					<h1 className="font-display text-3xl font-bold">{t("nav.styles")}</h1>
					<p className="text-sm text-muted-foreground">{t("styles.count", { count: styles.length })}</p>
				</div>
				<Button className="h-11" onClick={() => setDialog({ open: true, style: null })}>
					<Plus className="h-4 w-4" />
					{t("styles.new")}
				</Button>
			</header>

			{styles.length > 0 && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("styles.search")} aria-label={t("styles.search")} className="h-12 pl-9" />
					</div>
					{categories.length > 1 && (
						<div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t("styles.category")}>
							{["all", ...categories].map((c) => (
								<button
									key={c}
									type="button"
									aria-pressed={category === c}
									onClick={() => setCategory(c)}
									className={cn(
										"h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
									)}
								>
									{c === "all" ? t("orders.all") : c}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{isLoading ? (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" role="status" aria-label={t("common.loading")}>
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
					))}
				</div>
			) : isError ? (
				<div className="rounded-2xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : styles.length === 0 ? (
				<div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
					<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-primary">
						<Shirt className="h-6 w-6" aria-hidden />
					</span>
					<h2 className="mt-4 font-display text-xl font-bold">{t("styles.emptyTitle")}</h2>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("styles.emptyBody")}</p>
					<Button className="mt-6 h-11" onClick={() => setDialog({ open: true, style: null })}>
						<Plus className="h-4 w-4" />
						{t("styles.first")}
					</Button>
				</div>
			) : filtered.length === 0 ? (
				<p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("styles.noMatch")}</p>
			) : (
				<ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
					{filtered.map((s) => (
						<li key={s.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
							<div className="relative aspect-[4/5] bg-muted">
								{s.image_url ? (
									<img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
								) : (
									<div className="flex h-full items-center justify-center">
										<Shirt className="h-10 w-10 text-muted-foreground" aria-hidden />
									</div>
								)}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="secondary" size="icon" className="absolute right-2 top-2 h-9 w-9 rounded-full shadow-sm" aria-label={t("styles.actions", { name: s.name })}>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onSelect={() => setDialog({ open: true, style: s })}>
											<Pencil className="mr-2 h-4 w-4" />
											{t("common.edit")}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem onSelect={() => setDeleting(s)} className="text-destructive focus:text-destructive">
											<Trash2 className="mr-2 h-4 w-4" />
											{t("styles.delete")}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<div className="flex flex-1 flex-col p-3 sm:p-4">
								<h2 className="truncate font-semibold">{s.name}</h2>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">{s.category}</p>
								<p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
									<Ruler className="h-3 w-3" aria-hidden />
									{t("styles.fieldCount", { count: fieldsForStyle(s).length })}
								</p>
								<Button variant="outline" size="sm" className="mt-3 h-10 w-full" asChild>
									<Link to={`/orders/new?style=${s.id}`}>{t("nav.newOrder")}</Link>
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}

			<StyleDialog open={dialog.open} style={dialog.style} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} onSaved={refresh} />

			<AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("styles.deleteTitle", { name: deleting?.name })}</AlertDialogTitle>
						<AlertDialogDescription>{t("styles.deleteBody")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>
							{t("styles.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default Styles;
