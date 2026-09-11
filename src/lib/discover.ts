// Style inspiration from Wikimedia Commons. Volunteers sort its photos into clothing categories
// ("Agbada", "Brides of Nigeria", "Ankara style clothes in Nigeria"…), so every topic shows real outfits
// rather than whatever a keyword happens to match. No API key; CORS via origin=*.
// Nothing is copied to our storage: saving a photo keeps only its link, a name and a type.
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Category } from "@/lib/measurementTemplates";

export type DiscoverImage = {
	id: string;
	title: string;
	/** ~480px wide — for the grid. */
	thumb: string;
	/** ~800px wide — for the viewer and saved as the style's photo. */
	large: string;
	creator: string | null;
	license: string;
	landingUrl: string;
	/** Original size — lets the grid reserve each photo's shape before it loads. */
	width: number;
	height: number;
};

export type Group = "women" | "men" | "fabrics" | "world";

export const GROUPS: { key: Group; label: string }[] = [
	{ key: "women", label: "Women" },
	{ key: "men", label: "Men" },
	{ key: "fabrics", label: "Fabrics" },
	{ key: "world", label: "Worldwide" },
];

export type Topic = {
	key: string;
	group: Group;
	label: string;
	/** Commons categories, shown in this order. */
	categories: string[];
	/** Newest uploads first. Off by default: the categories' own order was the one checked for relevance. */
	newest?: boolean;
	/** Outfit type used when a photo is saved as a style (sets its measurements). */
	category: Category;
};

// Categories chosen by checking their photos — each is mostly wearable outfits, not events or objects.
export const TOPICS: Topic[] = [
	{ key: "ankara", group: "women", label: "Ankara styles", categories: ["Fashion in Africa", "Ankara style clothes in Nigeria"], category: "Dress" },
	{ key: "lace", group: "women", label: "Lace & couture", categories: ["Lustenau Lagos African Lace (exhibition)"], category: "Gown" },
	{ key: "bridal", group: "women", label: "Brides & trad wedding", categories: ["Brides of Nigeria", "Wedding clothes of Nigeria"], category: "Gown" },
	{ key: "buba", group: "women", label: "Buba, Iro & Gele", categories: ["Buba (blouse)"], category: "Buba & Iro" },
	{ key: "kaftan-women", group: "women", label: "Kaftans & boubou", categories: ["Women wearing kaftans"], category: "Kaftan" },
	{ key: "jumpsuit", group: "women", label: "Jumpsuits", categories: ["Women wearing jumpsuits", "Playsuit (Women's clothing)"], category: "Jumpsuit", newest: true },

	{ key: "agbada", group: "men", label: "Agbada", categories: ["Agbada"], category: "Agbada" },
	{ key: "senator", group: "men", label: "Senator & kaftan", categories: ["Hausa traditional wedding and dressing", "Hausa clothing"], category: "Kaftan" },
	{ key: "native-men", group: "men", label: "Native wear", categories: ["Traditional clothing of Nigeria"], category: "Other" },
	{ key: "dashiki", group: "men", label: "Dashiki", categories: ["Dashikis"], category: "Shirt" },
	{ key: "smock", group: "men", label: "Smock (fugu)", categories: ["Ghanaian smocks", "Fashion of Ghana"], category: "Shirt" },
	{ key: "kanzu", group: "men", label: "Kanzu & blazer", categories: ["Kanzu"], category: "Kaftan" },

	{ key: "kente", group: "fabrics", label: "Kente", categories: ["Kente cloth"], category: "Other" },
	{ key: "kita", group: "fabrics", label: "Pagne kita", categories: ["Pagne kita"], category: "Other" },
	{ key: "indigo", group: "fabrics", label: "Blue & indigo styles", categories: ["Blue clothing in Nigeria"], category: "Other" },

	{ key: "wedding-gowns", group: "world", label: "Wedding gowns", categories: ["Wedding dresses"], category: "Gown", newest: true },
	{ key: "suits", group: "world", label: "Suits", categories: ["Men wearing suits", "Three-piece suits"], category: "Suit", newest: true },
	{ key: "blazers", group: "world", label: "Blazers", categories: ["Blazers"], category: "Suit", newest: true },
];

const API = "https://commons.wikimedia.org/w/api.php";
const PAGE_SIZE = "30";
const IMAGE_INFO = {
	prop: "imageinfo",
	iiprop: "url|size|mime|extmetadata",
	iiurlwidth: "480",
	iiextmetadatafilter: "Artist|LicenseShortName",
};

type ImageInfo = {
	thumburl?: string;
	url: string;
	descriptionurl: string;
	width: number;
	height: number;
	mime: string;
	extmetadata?: Record<string, { value: string } | undefined>;
};
type ApiPage = { pageid: number; title: string; imageinfo?: ImageInfo[] };
type ApiResponse = { query?: { pages?: Record<string, ApiPage> }; continue?: Record<string, string>; error?: { info: string } };

const stripHtml = (html: string) => {
	const el = document.createElement("div");
	el.innerHTML = html;
	return (el.textContent ?? "").replace(/\s+/g, " ").trim();
};

function toImages(data: ApiResponse): DiscoverImage[] {
	return Object.values(data.query?.pages ?? {}).flatMap((page) => {
		const ii = page.imageinfo?.[0];
		// Photos only (no PDFs, drawings as SVG, video), big enough to see the outfit, and not wide panoramas.
		if (!ii?.thumburl || !/^image\/(jpeg|png|webp)$/.test(ii.mime)) return [];
		if (Math.min(ii.width, ii.height) < 500 || ii.width / ii.height > 1.7) return [];
		const creator = ii.extmetadata?.Artist?.value ? stripHtml(ii.extmetadata.Artist.value).slice(0, 60) : null;
		return [
			{
				id: String(page.pageid),
				title: page.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " "),
				thumb: ii.thumburl,
				large: ii.thumburl.includes("/480px-") ? ii.thumburl.replace("/480px-", "/800px-") : ii.thumburl,
				creator: creator || null,
				license: ii.extmetadata?.LicenseShortName?.value ?? "",
				landingUrl: ii.descriptionurl,
				width: ii.width,
				height: ii.height,
			},
		];
	});
}

async function call(params: Record<string, string>): Promise<ApiResponse> {
	const res = await fetch(`${API}?${new URLSearchParams({ action: "query", format: "json", origin: "*", ...params })}`);
	if (!res.ok) throw new Error(`Commons ${res.status}`);
	const data = (await res.json()) as ApiResponse;
	if (data.error) throw new Error(data.error.info);
	return data;
}

/** Where the next page comes from: which category in the topic's list, and the API's continue token. */
type Cursor = { cat: number; cont?: Record<string, string> };

async function topicPage(topic: Topic, cursor: Cursor) {
	const data = await call({
		generator: "categorymembers",
		gcmtitle: `Category:${topic.categories[cursor.cat]}`,
		gcmtype: "file",
		gcmlimit: PAGE_SIZE,
		// Big general categories (wedding gowns, suits) read better newest-first — fewer old archive photos.
		...(topic.newest ? { gcmsort: "timestamp", gcmdir: "desc" } : {}),
		...IMAGE_INFO,
		...(cursor.cont ?? {}),
	});
	const next: Cursor | undefined = data.continue
		? { cat: cursor.cat, cont: data.continue }
		: cursor.cat + 1 < topic.categories.length
			? { cat: cursor.cat + 1 }
			: undefined;
	return { images: toImages(data), next };
}

async function searchPage(query: string, cursor: Cursor) {
	const data = await call({
		generator: "search",
		gsrnamespace: "6",
		// Keep free-text search on clothing photos, not everything that shares the word.
		gsrsearch: `${query} deepcat:"Clothing of Nigeria" filetype:bitmap`,
		gsrlimit: PAGE_SIZE,
		...IMAGE_INFO,
		...(cursor.cont ?? {}),
	});
	return { images: toImages(data), next: data.continue ? { cat: 0, cont: data.continue } : undefined };
}

export type DiscoverSource = { kind: "topic"; topic: Topic } | { kind: "search"; query: string };

/** Paged photos for a topic or a search; cached for the session so switching back is instant. */
export function useDiscover(source: DiscoverSource) {
	return useInfiniteQuery({
		queryKey: ["discover", source.kind, source.kind === "topic" ? source.topic.key : source.query],
		initialPageParam: { cat: 0 } as Cursor,
		queryFn: ({ pageParam }) => (source.kind === "topic" ? topicPage(source.topic, pageParam) : searchPage(source.query, pageParam)),
		getNextPageParam: (last) => last.next,
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 60,
		retry: 1,
	});
}
