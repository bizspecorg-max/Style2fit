import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Plus, RotateCcw, Search, Shirt, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { DueDateChips, localIso } from "@/components/DueDateChips";
import type { MeasurementRecord } from "@/components/MeasurementDialog";
import { Avatar } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/pages/Customers";
import { CATEGORIES, TEMPLATES, type Category, type MeasurementField } from "@/lib/measurementTemplates";
import { PAYMENT_STATUSES, fieldsForStyle, parseMoney, type PaymentStatus } from "@/lib/orders";
import { useStyles } from "@/lib/styles";
import { formatDate, formatMoney, formatPhone, useShop } from "@/lib/shop";
import { convertInput, normalizeUnit, parseMeasure as parseNumber } from "@/lib/units";
import { cn } from "@/lib/utils";

const STEP_KEYS = ["customer", "style", "measure", "details"] as const;
/** Style choice meaning "not one of my saved styles" — it's saved as a new style when the order is created. */
const CUSTOM = "custom";
const DRAFT_KEY = "s2f-new-order-draft";
// Measurements tailors often add on top of a template.
const COMMON = ["Chest", "Waist", "Hip", "Shoulder", "Sleeve", "Round Sleeve", "Length", "Neck", "Thigh", "Knee", "Ankle", "Cap"];

type Draft = {
	step: number;
	customerId: string;
	styleId: string;
	customName: string;
	customCategory: Category | "";
	extraFields: MeasurementField[];
	values: Record<string, string>;
	price: string;
	deliveryDate: string;
	payment: PaymentStatus;
	notes: string;
};

const readDraft = (): Partial<Draft> => {
	try {
		return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}");
	} catch {
		return {};
	}
};
const clearDraft = () => {
	try {
		sessionStorage.removeItem(DRAFT_KEY);
	} catch {
		// Storage unavailable (private mode) — nothing to clear.
	}
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const tidyLabel = (s: string) => s.trim().replace(/\s+/g, " ").replace(/^\p{L}/u, (c) => c.toUpperCase());
/** A custom outfit starts with its category's usual measurements; "Other" starts empty. */
const templateFor = (c: Category | "") => (c && c !== "Other" ? TEMPLATES[c] : []);

const NewOrder = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [params] = useSearchParams();
	const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
	const { data: styles = [], isLoading: loadingStyles } = useStyles();

	// Links from a customer or style page start fresh; otherwise pick up where the tailor left off.
	const fromLink = !!(params.get("customer") || params.get("style"));
	const [draft] = useState<Partial<Draft>>(() => (fromLink ? {} : readDraft()));
	const [step, setStep] = useState(draft.step ?? (params.get("customer") ? 1 : 0));
	const [customerId, setCustomerId] = useState(draft.customerId ?? params.get("customer") ?? "");
	const [styleId, setStyleId] = useState(draft.styleId ?? params.get("style") ?? "");
	const [customName, setCustomName] = useState(draft.customName ?? "");
	const [customCategory, setCustomCategory] = useState<Category | "">(draft.customCategory ?? "");
	const [extraFields, setExtraFields] = useState<MeasurementField[]>(draft.extraFields ?? []);
	const [addToStyle, setAddToStyle] = useState(true);
	const [newLabel, setNewLabel] = useState("");
	const [values, setValues] = useState<Record<string, string>>(draft.values ?? {});
	const [prefillNote, setPrefillNote] = useState<string>();
	const [price, setPrice] = useState(draft.price ?? "");
	const [deliveryDate, setDeliveryDate] = useState(draft.deliveryDate ?? "");
	const [payment, setPayment] = useState<PaymentStatus>(draft.payment ?? "unpaid");
	const [notes, setNotes] = useState(draft.notes ?? "");
	const [customerQuery, setCustomerQuery] = useState("");
	const [styleQuery, setStyleQuery] = useState("");
	const [addingCustomer, setAddingCustomer] = useState(false);
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = `${t("nav.newOrder")} · Style2Fit`;
	}, [t]);

	// Keep the unfinished order if the tailor taps away (this browser tab only).
	useEffect(() => {
		const data: Draft = { step, customerId, styleId, customName, customCategory, extraFields, values, price, deliveryDate, payment, notes };
		try {
			sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
		} catch {
			// Storage unavailable — the order just isn't kept.
		}
	}, [step, customerId, styleId, customName, customCategory, extraFields, values, price, deliveryDate, payment, notes]);

	const isCustom = styleId === CUSTOM;
	const customer = customers.find((c) => c.id === customerId);
	const style = isCustom ? undefined : styles.find((s) => s.id === styleId);
	const baseFields = isCustom ? templateFor(customCategory) : fieldsForStyle(style);
	const fields = [...baseFields, ...extraFields.filter((e) => !baseFields.some((b) => b.key === e.key))];
	const addedKeys = new Set(fields.filter((f) => !baseFields.some((b) => b.key === f.key)).map((f) => f.key));
	const outfitName = isCustom ? customName.trim() || customCategory || t("orders.flow.customOutfit") : style?.name ?? "";
	const today = localIso(new Date());
	const currencySymbol = useMemo(
		() => new Intl.NumberFormat(shop.locale, { style: "currency", currency: shop.currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? shop.currency,
		[shop.locale, shop.currency]
	);

	// A new shop has no styles yet: start it on a custom outfit.
	useEffect(() => {
		if (step === 1 && !loadingStyles && styles.length === 0 && !styleId) setStyleId(CUSTOM);
	}, [step, loadingStyles, styles.length, styleId]);

	const customerMatches = useMemo(() => {
		const s = customerQuery.trim().toLowerCase();
		const digits = s.replace(/\D/g, "");
		return s
			? customers.filter((c) => c.name.toLowerCase().includes(s) || (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits)))
			: customers;
	}, [customers, customerQuery]);

	const styleMatches = useMemo(() => {
		const s = styleQuery.trim().toLowerCase();
		return s ? styles.filter((st) => st.name.toLowerCase().includes(s) || st.category.toLowerCase().includes(s)) : styles;
	}, [styles, styleQuery]);

	const suggestions = COMMON.filter((s) => !fields.some((f) => f.label.toLowerCase() === s.toLowerCase())).slice(0, 6);

	const addField = (raw: string) => {
		const label = tidyLabel(raw);
		setNewLabel("");
		if (!label || fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) return;
		const taken = new Set(fields.map((f) => f.key));
		const base = slug(label) || "measurement";
		let key = base;
		for (let i = 2; taken.has(key); i++) key = `${base}_${i}`;
		setExtraFields((current) => [...current, { key, label }]);
		setTimeout(() => document.getElementById(`m-${key}`)?.focus(), 50);
	};

	const removeField = (key: string) => {
		setExtraFields((current) => current.filter((f) => f.key !== key));
		setValues((current) => {
			const copy = { ...current };
			delete copy[key];
			return copy;
		});
	};

	const pickStyle = (id: string) => {
		setStyleId(id);
		setValues({});
		setPrefillNote(undefined);
	};

	const startOver = () => {
		clearDraft();
		setStep(0);
		setCustomerId("");
		setStyleId("");
		setCustomName("");
		setCustomCategory("");
		setExtraFields([]);
		setValues({});
		setPrefillNote(undefined);
		setPrice("");
		setDeliveryDate("");
		setPayment("unpaid");
		setNotes("");
		setError(undefined);
	};

	/** Fill measurement fields from the customer's latest saved measurements, matched by name. */
	const prefillFromLatest = async () => {
		if (!customerId) return;
		const { data } = await supabase
			.from("measurements")
			.select("id, title, fields, values, created_at")
			.eq("customer_id", customerId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		const latest = data as unknown as MeasurementRecord | null;
		if (!latest?.fields?.length) return setPrefillNote(undefined);
		const date = formatDate(latest.created_at, shop.locale);
		// Titles often already include the date ("Shirt · 10 Sept 2026") — don't repeat it.
		const note = latest.title.includes(date) ? t("orders.new.prefilledTitle", { title: latest.title }) : t("orders.new.prefilled", { title: latest.title, date });
		const valueOf = (f: MeasurementRecord["fields"][number]) => convertInput(latest.values?.[f.key] ?? "", normalizeUnit(f.unit) ?? shop.unit, shop.unit);

		// Nothing to match against (e.g. "Other"): bring over everything they were measured for last time.
		if (!fields.length) {
			setExtraFields(latest.fields.map((f) => ({ key: f.key, label: f.label })));
			setValues(Object.fromEntries(latest.fields.filter((f) => latest.values?.[f.key]).map((f) => [f.key, valueOf(f)])));
			return setPrefillNote(note);
		}
		const byLabel = new Map(latest.fields.map((f) => [f.label.trim().toLowerCase(), f]));
		const filled: Record<string, string> = {};
		for (const f of fields) {
			const match = byLabel.get(f.label.trim().toLowerCase());
			if (match && latest.values?.[match.key]) filled[f.key] = valueOf(match);
		}
		if (Object.keys(filled).length) {
			setValues((current) => ({ ...filled, ...Object.fromEntries(Object.entries(current).filter(([, v]) => v.trim())) }));
			setPrefillNote(note);
		}
	};

	const next = async () => {
		setError(undefined);
		if (step === 0 && !customerId) return setError(t("orders.new.errors.customer"));
		if (step === 1) {
			if (!styleId) return setError(t("orders.new.errors.style"));
			if (isCustom && !customCategory) return setError(t("orders.flow.errors.category"));
			await prefillFromLatest();
		}
		if (step === 2) {
			const bad = fields.find((f) => values[f.key]?.trim() && parseNumber(values[f.key]) === null);
			if (bad) return setError(t("measure.errors.notNumber", { label: bad.label }));
		}
		setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
		window.scrollTo(0, 0);
	};

	const create = async () => {
		setError(undefined);
		const amount = price.trim() ? parseMoney(price) : null;
		if (price.trim() && (amount === null || amount < 0)) return setError(t("orders.new.errors.price"));
		if (!user || !customerId || !styleId) return;
		setSaving(true);

		// Every order needs a style: a custom outfit becomes one, so it's a single tap next time.
		let finalStyleId = styleId;
		const template = fields.map(({ key, label }) => ({ key, label }));
		if (isCustom) {
			const { data: created, error: styleError } = await supabase
				.from("styles")
				.insert({ user_id: user.id, name: outfitName, category: customCategory || "Other", image_url: null, measurement_template: template })
				.select("id")
				.single();
			if (styleError) {
				setSaving(false);
				return setError(styleError.message);
			}
			finalStyleId = created.id as string;
		} else if (style && addToStyle && addedKeys.size) {
			await supabase.from("styles").update({ measurement_template: template }).eq("id", style.id);
		}

		const measurement_values = Object.fromEntries(
			Object.entries(values)
				.filter(([k, v]) => v.trim() && fields.some((f) => f.key === k))
				.map(([k, v]) => [k, String(parseNumber(v) ?? v.trim())])
		);
		const { data, error: insertError } = await supabase
			.from("orders")
			.insert({
				user_id: user.id,
				customer_id: customerId,
				style_id: finalStyleId,
				measurement_values,
				image_url: style?.image_url ?? null,
				status: "pending",
				payment_status: payment,
				delivery_date: deliveryDate || null,
				price: amount,
				notes: notes.trim() || null,
				code: "", // filled in by the database
			})
			.select("id")
			.single();
		setSaving(false);
		if (insertError) return setError(insertError.message);
		clearDraft();
		for (const key of ["orders", "dashboard", "customer", "customers", "styles"]) queryClient.invalidateQueries({ queryKey: [key] });
		toast.success(t("orders.new.created"));
		navigate(`/orders/${data.id}`, { replace: true });
	};

	const filledCount = fields.filter((f) => values[f.key]?.trim()).length;
	const chip = (active: boolean) =>
		cn(
			"h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
			active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/30"
		);

	return (
		<div className="mx-auto max-w-3xl space-y-6 pb-24 md:pb-0">
			<Link to="/orders" className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<ArrowLeft className="h-4 w-4" />
				{t("nav.orders")}
			</Link>
			<header className="flex items-end justify-between gap-3">
				<div>
					<p className="eyebrow">
						{t("signup.stepOf", { current: step + 1, total: STEP_KEYS.length })} · {t(`orders.new.steps.${STEP_KEYS[step]}`)}
					</p>
					<h1 className="mt-1.5 font-display text-3xl leading-tight sm:text-4xl">{t("nav.newOrder")}</h1>
				</div>
				{(step > 0 || customerId) && (
					<Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={startOver}>
						<RotateCcw className="h-4 w-4" />
						{t("orders.flow.startOver")}
					</Button>
				)}
			</header>

			<ol className="grid grid-cols-4 gap-2" aria-label={t("orders.new.progress")}>
				{STEP_KEYS.map((key, i) => (
					<li key={key} aria-current={step === i ? "step" : undefined}>
						<button type="button" disabled={i > step} onClick={() => setStep(i)} className="group w-full text-left disabled:cursor-default">
							<span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
							<span className={cn("mt-2 block truncate text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{t(`orders.new.steps.${key}`)}</span>
						</button>
					</li>
				))}
			</ol>

			<section className="rounded-3xl border bg-card p-4 shadow-card sm:p-6">
				{step === 0 && (
					<fieldset className="space-y-4">
						<legend className="sr-only">{t("orders.new.steps.customer")}</legend>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
								<Input
									type="search"
									value={customerQuery}
									onChange={(e) => setCustomerQuery(e.target.value)}
									placeholder={t("customers.search")}
									aria-label={t("customers.search")}
									className="h-12 rounded-full pl-11"
								/>
							</div>
							<Button type="button" variant="outline" className="h-12 rounded-full px-4" onClick={() => setAddingCustomer(true)}>
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">{t("customers.add")}</span>
								<span className="sr-only sm:hidden">{t("customers.add")}</span>
							</Button>
						</div>
						{loadingCustomers ? (
							<div className="space-y-2">
								{[0, 1, 2].map((i) => (
									<Skeleton key={i} className="h-16 w-full rounded-2xl" />
								))}
							</div>
						) : customers.length === 0 ? (
							<div className="rounded-2xl bg-muted/60 p-6 text-center">
								<p className="text-sm text-muted-foreground">{t("orders.new.noCustomers")}</p>
								<Button className="mt-4 rounded-full" onClick={() => setAddingCustomer(true)}>
									<Plus className="h-4 w-4" />
									{t("customers.addFirst")}
								</Button>
							</div>
						) : (
							<div className="-mx-1 max-h-[24rem] space-y-2 overflow-y-auto px-1 py-1" role="radiogroup" aria-label={t("orders.new.steps.customer")}>
								{customerMatches.map((c) => (
									<label
										key={c.id}
										className={cn(
											"flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											customerId === c.id ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:border-primary/30 hover:bg-muted/40"
										)}
									>
										<input type="radio" name="customer" value={c.id} checked={customerId === c.id} onChange={() => setCustomerId(c.id)} className="sr-only" />
										<Avatar name={c.name} size="sm" />
										<span className="min-w-0 flex-1">
											<span className="block truncate font-semibold">{c.name}</span>
											<span className="block truncate text-sm tabular-nums text-muted-foreground">{c.phone ? formatPhone(c.phone) : t("customers.noContact")}</span>
										</span>
										<span
											className={cn(
												"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
												customerId === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
											)}
											aria-hidden
										>
											{customerId === c.id && <Check className="h-3.5 w-3.5" />}
										</span>
									</label>
								))}
								{customerMatches.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">{t("customers.noMatch", { q: customerQuery })}</p>}
							</div>
						)}
					</fieldset>
				)}

				{step === 1 && (
					<fieldset className="space-y-4">
						<legend className="sr-only">{t("orders.new.steps.style")}</legend>
						{styles.length > 6 && (
							<div className="relative">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
								<Input type="search" value={styleQuery} onChange={(e) => setStyleQuery(e.target.value)} placeholder={t("orders.flow.searchStyles")} aria-label={t("orders.flow.searchStyles")} className="h-12 rounded-full pl-11" />
							</div>
						)}
						{loadingStyles ? (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{[0, 1, 2].map((i) => (
									<Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
								))}
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("orders.new.steps.style")}>
								<label
									className={cn(
										"flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card p-3 text-center transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
										isCustom ? "border-primary bg-primary/[0.04]" : "hover:border-primary/40"
									)}
								>
									<input type="radio" name="style" value={CUSTOM} checked={isCustom} onChange={() => pickStyle(CUSTOM)} className="sr-only" />
									<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent" aria-hidden>
										<Sparkles className="h-5 w-5" />
									</span>
									<span className="mt-3 font-display text-base leading-tight">{t("orders.flow.customOutfit")}</span>
									<span className="mt-1 text-xs text-muted-foreground">{t("orders.flow.customOutfitHint")}</span>
								</label>
								{styleMatches.map((s) => {
									const selected = styleId === s.id;
									return (
										<label
											key={s.id}
											className={cn(
												"relative block cursor-pointer overflow-hidden rounded-2xl bg-muted shadow-card transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
												selected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:shadow-soft"
											)}
										>
											<input type="radio" name="style" value={s.id} checked={selected} onChange={() => pickStyle(s.id)} className="sr-only" />
											<span className="relative block aspect-[3/4]">
												{s.image_url ? (
													<img src={s.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
												) : (
													<span className="flex h-full items-center justify-center bg-gradient-to-b from-secondary to-muted">
														<Shirt className="h-8 w-8 text-muted-foreground/60" aria-hidden />
													</span>
												)}
												<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 text-white">
													<span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{s.category}</span>
													<span className="block truncate font-display text-base leading-tight">{s.name}</span>
												</span>
												{selected && (
													<span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft" aria-hidden>
														<Check className="h-4 w-4" />
													</span>
												)}
											</span>
										</label>
									);
								})}
							</div>
						)}

						{isCustom && (
							<div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
								<fieldset>
									<legend className="text-sm font-medium">{t("orders.flow.outfitCategory")}</legend>
									<div className="mt-2 flex flex-wrap gap-2">
										{CATEGORIES.map((c) => (
											<button
												key={c}
												type="button"
												aria-pressed={customCategory === c}
												onClick={() => {
													setCustomCategory(c);
													setValues({});
												}}
												className={chip(customCategory === c)}
											>
												{c}
											</button>
										))}
									</div>
									<p className="mt-2 text-xs text-muted-foreground">{t("orders.flow.outfitCategoryHint")}</p>
								</fieldset>
								<div className="space-y-1.5">
									<Label htmlFor="custom-name">{t("orders.flow.outfitName")}</Label>
									<Input id="custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={t("orders.flow.outfitNamePlaceholder")} className="h-12" />
								</div>
								<p className="text-xs text-muted-foreground">{t("orders.flow.savedAsStyle")}</p>
							</div>
						)}
					</fieldset>
				)}

				{step === 2 && (
					<fieldset className="space-y-4">
						<legend className="font-display text-xl">{t("orders.new.measureFor", { name: customer?.name ?? "", style: outfitName })}</legend>
						{prefillNote && <p className="rounded-2xl border border-accent/30 bg-accent-soft/70 p-3 text-sm">{prefillNote}</p>}
						{fields.length > 0 && (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{fields.map((f) => (
									<div key={f.key} className="space-y-1.5 rounded-2xl bg-muted/50 p-3">
										<div className="flex items-center justify-between gap-1">
											<Label htmlFor={`m-${f.key}`} className="block truncate text-xs text-muted-foreground">
												{f.label}
											</Label>
											{addedKeys.has(f.key) && (
												<button
													type="button"
													onClick={() => removeField(f.key)}
													aria-label={t("orders.flow.removeField", { label: f.label })}
													className="-m-1 rounded-full p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
										<div className="relative">
											<Input
												id={`m-${f.key}`}
												inputMode="decimal"
												value={values[f.key] ?? ""}
												onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
												className="h-12 bg-card pr-9 text-right font-display text-lg tabular-nums"
											/>
											<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{shop.unit}</span>
										</div>
									</div>
								))}
							</div>
						)}

						<div className="rounded-2xl border border-dashed p-3 sm:p-4">
							<Label htmlFor="new-field" className="text-sm font-medium">
								{t("orders.flow.addMeasurement")}
							</Label>
							<div className="mt-2 flex gap-2">
								<Input
									id="new-field"
									value={newLabel}
									onChange={(e) => setNewLabel(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addField(newLabel);
										}
									}}
									placeholder={t("orders.flow.addMeasurementPlaceholder")}
									className="h-11 rounded-full"
								/>
								<Button type="button" variant="outline" className="h-11 shrink-0 rounded-full" onClick={() => addField(newLabel)} disabled={!newLabel.trim()}>
									<Plus className="h-4 w-4" />
									{t("orders.flow.add")}
								</Button>
							</div>
							{suggestions.length > 0 && (
								<div className="mt-3 flex flex-wrap items-center gap-1.5">
									<span className="text-xs text-muted-foreground">{t("orders.flow.suggestions")}</span>
									{suggestions.map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => addField(s)}
											className="h-8 rounded-full border bg-card px-3 text-xs font-medium transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											+ {s}
										</button>
									))}
								</div>
							)}
						</div>

						{style && addedKeys.size > 0 && (
							<label className="flex items-start gap-2.5 text-sm">
								<input type="checkbox" checked={addToStyle} onChange={(e) => setAddToStyle(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
								{t("orders.flow.addToStyle", { style: style.name })}
							</label>
						)}
						<p className="text-xs text-muted-foreground">{t("orders.new.measureHint", { unit: t(`measure.unitName.${shop.unit}`) })}</p>
					</fieldset>
				)}

				{step === 3 && (
					<div className="space-y-5">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="order-price">{t("orders.new.price", { currency: shop.currency })}</Label>
								<div className="relative">
									<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-display text-lg text-muted-foreground">{currencySymbol}</span>
									<Input
										id="order-price"
										inputMode="decimal"
										value={price}
										onChange={(e) => setPrice(e.target.value.replace(/[^\d.,\s]/g, ""))}
										onBlur={() => {
											const n = parseMoney(price);
											if (n !== null) setPrice(n.toLocaleString(shop.locale));
										}}
										placeholder="0"
										className="h-12 pl-10 font-display text-lg tabular-nums"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="order-date">{t("orders.new.deliveryDate")}</Label>
								<Input id="order-date" type="date" min={today} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-12" />
								<DueDateChips value={deliveryDate} onChange={setDeliveryDate} />
							</div>
						</div>
						<fieldset className="space-y-1.5">
							<legend className="text-sm font-medium">{t("orders.new.payment")}</legend>
							<div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="radiogroup">
								{PAYMENT_STATUSES.map((p) => (
									<label
										key={p}
										className={cn(
											"flex h-10 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											payment === p ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
										)}
									>
										<input type="radio" name="payment" value={p} checked={payment === p} onChange={() => setPayment(p)} className="sr-only" />
										{t(`paymentStatus.${p}`)}
									</label>
								))}
							</div>
						</fieldset>
						<div className="space-y-1.5">
							<Label htmlFor="order-notes">{t("customers.notesOptional")}</Label>
							<Textarea id="order-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("orders.new.notesPlaceholder")} />
						</div>

						<div className="flex gap-4 rounded-2xl border bg-muted/40 p-4">
							<span className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
								{style?.image_url ? <img src={style.image_url} alt="" className="h-full w-full object-cover" /> : <Shirt className="h-6 w-6 text-muted-foreground" aria-hidden />}
							</span>
							<dl className="min-w-0 flex-1 space-y-1.5 text-sm">
								<div className="flex justify-between gap-2">
									<dt className="text-muted-foreground">{t("orders.new.steps.customer")}</dt>
									<dd className="truncate font-medium">{customer?.name}</dd>
								</div>
								<div className="flex justify-between gap-2">
									<dt className="text-muted-foreground">{t("orders.new.steps.style")}</dt>
									<dd className="truncate font-medium">{outfitName}</dd>
								</div>
								<div className="flex justify-between gap-2">
									<dt className="text-muted-foreground">{t("orders.new.steps.measure")}</dt>
									<dd className="font-medium">{t("orders.new.filled", { count: filledCount, total: fields.length })}</dd>
								</div>
								<div className="flex items-baseline justify-between gap-2 border-t pt-1.5">
									<dt className="text-muted-foreground">{t("orders.new.total")}</dt>
									<dd className="font-display text-xl tabular-nums">{formatMoney(price.trim() ? parseMoney(price) : null, shop.currency, shop.locale)}</dd>
								</div>
							</dl>
						</div>
					</div>
				)}

				{error && (
					<p role="alert" className="mt-5 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</p>
				)}
			</section>

			{/* Actions: pinned above the tab bar on phones */}
			<div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
				<div className="mx-auto flex max-w-3xl gap-2">
					{step > 0 && (
						<Button type="button" variant="outline" className="h-12 rounded-full bg-card px-5" onClick={() => setStep(step - 1)} disabled={saving}>
							<ArrowLeft className="h-4 w-4" />
							{t("signup.back")}
						</Button>
					)}
					{step < STEP_KEYS.length - 1 ? (
						<Button type="button" className="h-12 flex-1 rounded-full text-base shadow-soft" onClick={next}>
							{t("signup.continue")}
						</Button>
					) : (
						<Button type="button" className="h-12 flex-1 rounded-full text-base shadow-soft" onClick={create} disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{t("orders.new.create")}
						</Button>
					)}
				</div>
			</div>

			<CustomerFormDialog
				open={addingCustomer}
				onOpenChange={setAddingCustomer}
				onSaved={async (id) => {
					await queryClient.invalidateQueries({ queryKey: ["customers"] });
					setCustomerId(id);
				}}
			/>
		</div>
	);
};

export default NewOrder;
