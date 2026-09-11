import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Compass, MoreHorizontal, Pencil, Plus, Ruler, Search, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DiscoverPanel } from "@/components/DiscoverPanel";
import { StyleDialog } from "@/components/StyleDialog";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import type { Category } from "@/lib/measurementTemplates";
import { fieldsForStyle } from "@/lib/orders";
import { useStyles, type StyleRow } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Initial = { name: string; category: Category; image_url: string };

const Styles = () => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: styles = [], isLoading, isError, refetch } = useStyles();
	const [tab, setTab] = useState<"mine" | "discover">("mine");
	const [q, setQ] = useState("");
	const [category, setCategory] = useState("all");
	const [dialog, setDialog] = useState<{ open: boolean; style: StyleRow | null; initial: Initial | null }>({ open: false, style: null, initial: null });
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
	const openNew = () => setDialog({ open: true, style: null, initial: null });
	const openEdit = (style: StyleRow) => setDialog({ open: true, style, initial: null });

	const remove = async () => {
		if (!deleting) return;
		const { error } = await supabase.from("styles").delete().eq("id", deleting.id);
		setDeleting(null);
		if (error) return toast.error(error.code === "23503" ? t("styles.inUse") : error.message);
		toast.success(t("styles.deleted"));
		refresh();
	};

	const tabTrigger = "h-10 flex-1 gap-1.5 rounded-full px-4 data-[state=active]:shadow-card sm:flex-none";

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("nav.styles")}
				subtitle={t("styles.count", { count: styles.length })}
				actions={
					<Button className="h-11 rounded-full px-5" onClick={openNew}>
						<Plus className="h-4 w-4" />
						{t("styles.new")}
					</Button>
				}
			/>

			<Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "discover")}>
				<TabsList className="h-12 w-full rounded-full bg-muted p-1 sm:w-auto">
					<TabsTrigger value="mine" className={tabTrigger}>
						<Shirt className="h-4 w-4" />
						{t("styles.tabs.mine")}
					</TabsTrigger>
					<TabsTrigger value="discover" className={tabTrigger}>
						<Compass className="h-4 w-4" />
						{t("styles.tabs.discover")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="mine" className="mt-5 space-y-5">
					{styles.length > 0 && (
						<div className="space-y-3">
							<div className="relative">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
								<Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("styles.search")} aria-label={t("styles.search")} className="h-12 rounded-full bg-card pl-11 shadow-card" />
							</div>
							{categories.length > 1 && (
								<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label={t("styles.category")}>
									{["all", ...categories].map((c) => (
										<button
											key={c}
											type="button"
											aria-pressed={category === c}
											onClick={() => setCategory(c)}
											className={cn(
												"h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												category === c ? "border-primary bg-primary text-primary-foreground shadow-card" : "bg-card hover:border-primary/30"
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
						<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" role="status" aria-label={t("common.loading")}>
							{[0, 1, 2, 3].map((i) => (
								<Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
							))}
						</div>
					) : isError ? (
						<div className="rounded-3xl border bg-card p-8 text-center">
							<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
							<Button variant="outline" className="mt-4" onClick={() => refetch()}>
								{t("common.retry")}
							</Button>
						</div>
					) : styles.length === 0 ? (
						<EmptyState
							icon={Shirt}
							title={t("styles.emptyTitle")}
							body={t("styles.emptyBody")}
							action={
								<div className="flex flex-wrap justify-center gap-2">
									<Button className="h-11 rounded-full px-6" onClick={openNew}>
										<Plus className="h-4 w-4" />
										{t("styles.first")}
									</Button>
									<Button variant="outline" className="h-11 rounded-full bg-card px-6" onClick={() => setTab("discover")}>
										<Compass className="h-4 w-4" />
										{t("styles.tabs.discover")}
									</Button>
								</div>
							}
						/>
					) : filtered.length === 0 ? (
						<p className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("styles.noMatch")}</p>
					) : (
						<ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
							{filtered.map((s) => (
								<li key={s.id} className="group relative">
									<button
										type="button"
										onClick={() => openEdit(s)}
										className="block w-full overflow-hidden rounded-3xl bg-muted text-left shadow-card transition-shadow duration-300 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										<span className="relative block aspect-[3/4]">
											{s.image_url ? (
												<img src={s.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
											) : (
												<span className="flex h-full items-center justify-center bg-gradient-to-b from-secondary to-muted">
													<Shirt className="h-10 w-10 text-muted-foreground/60" aria-hidden />
												</span>
											)}
											<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3.5 pt-14 text-white sm:p-4 sm:pt-16">
												<span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{s.category}</span>
												<span className="mt-0.5 block truncate font-display text-lg leading-tight">{s.name}</span>
												<span className="mt-1 inline-flex items-center gap-1 text-xs text-white/75">
													<Ruler className="h-3 w-3" aria-hidden />
													{t("styles.fieldCount", { count: fieldsForStyle(s).length })}
												</span>
											</span>
										</span>
									</button>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="secondary"
												size="icon"
												className="absolute right-2.5 top-2.5 h-9 w-9 rounded-full bg-white/90 text-foreground shadow-card backdrop-blur hover:bg-white"
												aria-label={t("styles.actions", { name: s.name })}
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-56">
											<DropdownMenuItem asChild>
												<Link to={`/orders/new?style=${s.id}`}>
													<ClipboardList className="mr-2 h-4 w-4" />
													{t("styles.useForOrder")}
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem onSelect={() => openEdit(s)}>
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
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="discover" className="mt-5">
					<DiscoverPanel
						onSave={(image, topic) =>
							setDialog({
								open: true,
								style: null,
								initial: { name: topic?.label ?? "", category: topic?.category ?? "Other", image_url: image.large },
							})
						}
					/>
				</TabsContent>
			</Tabs>

			<StyleDialog
				open={dialog.open}
				style={dialog.style}
				initial={dialog.initial}
				onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
				onSaved={() => {
					refresh();
					if (dialog.initial) setTab("mine");
				}}
			/>

			<AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
				<AlertDialogContent className="rounded-3xl">
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
