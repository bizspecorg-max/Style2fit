// Style inspiration from Openverse (openly licensed images from Wikimedia, Flickr and others).
// Nothing is copied to our storage: saving a find keeps only its link, name and type in the tailor's styles.
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Category } from "@/lib/measurementTemplates";

export type DiscoverImage = {
	id: string;
	title: string;
	url: string;
	thumbnail: string;
	creator: string | null;
	license: string;
	licenseVersion: string | null;
	landingUrl: string;
	source: string;
};

export type Topic = { key: string; label: string; query: string; category: Category };

export const TOPICS: Topic[] = [
	{ key: "agbada", label: "Agbada", query: "agbada", category: "Agbada" },
	{ key: "ankara", label: "Ankara dresses", query: "ankara dress", category: "Dress" },
	{ key: "senator", label: "Senator", query: "senator native wear", category: "Kaftan" },
	{ key: "dashiki", label: "Dashiki", query: "dashiki", category: "Shirt" },
	{ key: "kente", label: "Kente", query: "kente fashion", category: "Other" },
	{ key: "suit", label: "Print suits", query: "african print suit", category: "Suit" },
	{ key: "skirt", label: "Skirts", query: "african print skirt", category: "Skirt" },
	{ key: "buba", label: "Buba & Iro", query: "iro and buba", category: "Buba & Iro" },
	{ key: "kaftan", label: "Kaftan", query: "kaftan african", category: "Kaftan" },
	{ key: "fashion", label: "African fashion", query: "african fashion", category: "Other" },
];

/** Ask the source itself for a web-sized copy (Wikimedia originals can be several MB). */
function sized(url: string, width: 400 | 800) {
	const wiki = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
	if (wiki) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${wiki[1]}/${wiki[2]}/${width}px-${wiki[2]}`;
	// Flickr size suffixes: _w = 400px, _c = 800px.
	const flickr = url.match(/^(https:\/\/live\.staticflickr\.com\/.+?)(?:_[a-z])?\.jpg$/);
	if (flickr) return `${flickr[1]}_${width === 400 ? "w" : "c"}.jpg`;
	return url;
}

/** Small copy for the grid. (Openverse's own thumbnail service is the fallback — it's often unavailable.) */
export const gridUrl = (image: Pick<DiscoverImage, "url">) => sized(image.url, 400);

/** 800px copy — used for the viewer and saved as the style's photo link. */
export function displayUrl(image: Pick<DiscoverImage, "url" | "thumbnail">) {
	const url = sized(image.url, 800);
	return url.startsWith("https://") ? url : image.thumbnail;
}

const API = "https://api.openverse.org/v1/images/";
// Openverse allows at most 20 per page without an API key.
const PAGE_SIZE = 20;

type ApiImage = {
	id: string;
	title: string | null;
	url: string;
	thumbnail: string;
	creator: string | null;
	license: string;
	license_version: string | null;
	foreign_landing_url: string;
	source: string;
};

export class RateLimitError extends Error {}

async function searchPage(query: string, page: number) {
	// Wikimedia and Flickr serve web-sized copies we can link to directly.
	const params = new URLSearchParams({ q: query, page_size: String(PAGE_SIZE), page: String(page), mature: "false", source: "wikimedia,flickr" });
	const res = await fetch(`${API}?${params}`);
	if (res.status === 429) throw new RateLimitError("rate limited");
	if (!res.ok) throw new Error(`Openverse ${res.status}`);
	const data = (await res.json()) as { page_count: number; results: ApiImage[] };
	return {
		page,
		pageCount: data.page_count,
		results: data.results.map<DiscoverImage>((r) => ({
			id: r.id,
			title: r.title?.trim() || query,
			url: r.url,
			thumbnail: r.thumbnail,
			creator: r.creator,
			license: r.license,
			licenseVersion: r.license_version,
			landingUrl: r.foreign_landing_url,
			source: r.source,
		})),
	};
}

/** Paged search; results are cached for the session so browsing back and forth doesn't use up the free quota. */
export function useDiscover(query: string) {
	return useInfiniteQuery({
		queryKey: ["discover", query],
		enabled: !!query.trim(),
		initialPageParam: 1,
		queryFn: ({ pageParam }) => searchPage(query.trim(), pageParam),
		getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60,
		retry: (count, error) => !(error instanceof RateLimitError) && count < 1,
	});
}

/** "CC BY-SA 3.0" — "cc0" and "pdm" are public domain. */
export function licenseLabel(image: Pick<DiscoverImage, "license" | "licenseVersion">) {
	if (image.license === "cc0") return "CC0";
	if (image.license === "pdm") return "Public domain";
	return `CC ${image.license.toUpperCase()}${image.licenseVersion ? ` ${image.licenseVersion}` : ""}`;
}
