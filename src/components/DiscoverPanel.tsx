import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { RateLimitError, TOPICS, displayUrl, gridUrl, licenseLabel, useDiscover, type DiscoverImage, type Topic } from "@/lib/discover";
import { cn } from "@/lib/utils";

function Credit({ image }: { image: DiscoverImage }) {
	const { t } = useTranslation();
	const license = licenseLabel(image);
	const source = image.source.replace(/_/g, " ");
	return <>{image.creator ? t("styles.discover.credit", { creator: image.creator, license, source }) : t("styles.discover.creditNoName", { license, source })}</>;
}

/** Browse openly licensed outfit photos; saving one hands its link to the style form. */
export function DiscoverPanel({ onSave }: { onSave: (image: DiscoverImage, topic: Topic | null) => void }) {
	const { t } = useTranslation();
	const [topic, setTopic] = useState<Topic | null>(TOPICS[0]);
	const [input, setInput] = useState("");
	const [query, setQuery] = useState(TOPICS[0].query);
	const [viewing, setViewing] = useState<DiscoverImage | null>(null);
	// Photos load from their source first; if that fails, Openverse's thumbnail; if that fails too, they're hidden.
	const [fallback, setFallback] = useState<Set<string>>(() => new Set());
	const [broken, setBroken] = useState<Set<string>>(() => new Set());
	const [viewerFallback, setViewerFallback] = useState(false);
	const onImageError = (id: string) => {
		if (!fallback.has(id)) setFallback((f) => new Set(f).add(id));
		else setBroken((b) => new Set(b).add(id));
	};
	const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useDiscover(query);

	const images = useMemo(() => {
		const seen = new Set<string>();
		return (data?.pages.flatMap((p) => p.results) ?? []).filter((img) => !broken.has(img.id) && !seen.has(img.id) && seen.add(img.id));
	}, [data, broken]);

	const chooseTopic = (next: Topic) => {
		setTopic(next);
		setInput("");
		setQuery(next.query);
	};

	return (
		<div className="space-y-4">
			<p className="text-sm leading-relaxed text-muted-foreground">{t("styles.discover.intro")}</p>
			<form
				role="search"
				className="relative"
				onSubmit={(e) => {
					e.preventDefault();
					if (!input.trim()) return;
					setTopic(null);
					setQuery(input.trim());
				}}
			>
				<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
				<Input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("styles.discover.search")} aria-label={t("styles.discover.search")} className="h-12 rounded-full bg-card pl-11 shadow-card" />
			</form>
			<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t("styles.category")}>
				{TOPICS.map((tp) => (
					<button
						key={tp.key}
						type="button"
						aria-pressed={topic?.key === tp.key}
						onClick={() => chooseTopic(tp)}
						className={cn(
							"h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							topic?.key === tp.key ? "border-primary bg-primary text-primary-foreground shadow-card" : "bg-card hover:border-primary/30"
						)}
					>
						{tp.label}
					</button>
				))}
			</div>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label={t("common.loading")}>
					{Array.from({ length: 8 }, (_, i) => (
						<Skeleton key={i} className={cn("rounded-2xl", i % 3 ? "aspect-[3/4]" : "aspect-square")} />
					))}
				</div>
			) : isError ? (
				<div className="rounded-3xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{error instanceof RateLimitError ? t("styles.discover.rateLimited") : t("styles.discover.error")}</p>
					<Button variant="outline" className="mt-4 rounded-full" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : images.length === 0 ? (
				<p className="rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("styles.discover.empty")}</p>
			) : (
				<>
					{/* Masonry: photos keep their own shape. */}
					<ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
						{images.map((img) => (
							<li key={img.id} className="mb-3 break-inside-avoid">
								<button
									type="button"
									onClick={() => {
										setViewerFallback(false);
										setViewing(img);
									}}
									className="group relative block w-full overflow-hidden rounded-2xl bg-muted shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<img
										src={fallback.has(img.id) ? img.thumbnail : gridUrl(img)}
										alt={img.title}
										loading="lazy"
										onError={() => onImageError(img.id)}
										className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									<span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
										<Plus className="h-4 w-4" />
									</span>
								</button>
							</li>
						))}
					</ul>
					{hasNextPage && (
						<div className="flex justify-center">
							<Button variant="outline" className="h-11 rounded-full bg-card px-6" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
								{isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
								{t("styles.discover.loadMore")}
							</Button>
						</div>
					)}
				</>
			)}
			<p className="text-center text-xs text-muted-foreground">
				<a href="https://openverse.org" target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
					{t("styles.discover.poweredBy")}
				</a>
			</p>

			<Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
				<DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
					{viewing && (
						<>
							<DialogHeader>
								<DialogTitle className="line-clamp-2 text-xl">{viewing.title}</DialogTitle>
								<DialogDescription>
									<Credit image={viewing} />
								</DialogDescription>
							</DialogHeader>
							<img
								src={viewerFallback ? viewing.thumbnail : displayUrl(viewing)}
								alt={viewing.title}
								onError={() => setViewerFallback(true)}
								className="max-h-[55dvh] w-full rounded-2xl bg-muted object-contain"
							/>
							<DialogFooter className="gap-2 sm:gap-0">
								<Button variant="outline" className="rounded-full" asChild>
									<a href={viewing.landingUrl} target="_blank" rel="noreferrer">
										<ExternalLink className="h-4 w-4" />
										{t("styles.discover.viewSource")}
									</a>
								</Button>
								<Button
									className="rounded-full"
									onClick={() => {
										onSave(viewing, topic);
										setViewing(null);
									}}
								>
									<Plus className="h-4 w-4" />
									{t("styles.discover.save")}
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
