import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Plus, Search, Shirt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import type { MeasurementRecord } from "@/components/MeasurementDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/pages/Customers";
import { PAYMENT_STATUSES, fieldsForStyle, type PaymentStatus } from "@/lib/orders";
import { useStyles } from "@/lib/styles";
import { formatDate, formatMoney, formatPhone, initials, useShop } from "@/lib/shop";
import { convertInput, normalizeUnit, parseMeasure as parseNumber } from "@/lib/units";
import { cn } from "@/lib/utils";

const STEP_KEYS = ["customer", "style", "measure", "details"] as const;

const NewOrder = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [params] = useSearchParams();
	const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
	const { data: styles = [], isLoading: loadingStyles } = useStyles();

	const [step, setStep] = useState(0);
	const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
	const [styleId, setStyleId] = useState(params.get("style") ?? "");
	const [values, setValues] = useState<Record<string, string>>({});
	const [prefillNote, setPrefillNote] = useState<string>();
	const [price, setPrice] = useState("");
	const [deliveryDate, setDeliveryDate] = useState("");
	const [payment, setPayment] = useState<PaymentStatus>("unpaid");
	const [notes, setNotes] = useState("");
	const [customerQuery, setCustomerQuery] = useState("");
	const [addingCustomer, setAddingCustomer] = useState(false);
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = `${t("nav.newOrder")} · Style2Fit`;
	}, [t]);

	const customer = customers.find((c) => c.id === customerId);
	const style = styles.find((s) => s.id === styleId);
	const fields = fieldsForStyle(style);
	const today = new Date().toISOString().slice(0, 10);

	const customerMatches = useMemo(() => {
		const s = customerQuery.trim().toLowerCase();
		return s ? customers.filter((c) => c.name.toLowerCase().includes(s) || (c.phone ?? "").includes(s)) : customers;
	}, [customers, customerQuery]);

	/** Fill measurement fields from the customer's latest saved measurements, matched by name. */
	const prefillFromLatest = async () => {
		if (!customerId || !fields.length) return;
		const { data } = await supabase
			.from("measurements")
			.select("id, title, fields, values, created_at")
			.eq("customer_id", customerId)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();
		const latest = data as unknown as MeasurementRecord | null;
		if (!latest) return setPrefillNote(undefined);
		const byLabel = new Map(
			(latest.fields ?? []).map((f) => [f.label.trim().toLowerCase(), { value: latest.values?.[f.key], unit: normalizeUnit(f.unit) ?? shop.unit }])
		);
		const filled: Record<string, string> = {};
		for (const f of fields) {
			const match = byLabel.get(f.label.trim().toLowerCase());
			if (match?.value) filled[f.key] = convertInput(match.value, match.unit, shop.unit);
		}
		if (Object.keys(filled).length) {
			setValues((current) => ({ ...filled, ...Object.fromEntries(Object.entries(current).filter(([, v]) => v.trim())) }));
			const date = formatDate(latest.created_at, shop.locale);
			// Titles often already include the date ("Shirt · 10 Sept 2026") — don't repeat it.
			setPrefillNote(
				latest.title.includes(date)
					? t("orders.new.prefilledTitle", { title: latest.title })
					: t("orders.new.prefilled", { title: latest.title, date })
			);
		}
	};

	const next = async () => {
		setError(undefined);
		if (step === 0 && !customerId) return setError(t("orders.new.errors.customer"));
		if (step === 1) {
			if (!styleId) return setError(t("orders.new.errors.style"));
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
		const amount = price.trim() ? parseNumber(price) : null;
		if (price.trim() && (amount === null || amount < 0)) return setError(t("orders.new.errors.price"));
		if (!user || !customerId || !styleId) return;
		setSaving(true);
		const measurement_values = Object.fromEntries(
			Object.entries(values)
				.filter(([, v]) => v.trim())
				.map(([k, v]) => [k, String(parseNumber(v) ?? v.trim())])
		);
		const { data, error: insertError } = await supabase
			.from("orders")
			.insert({
				user_id: user.id,
				customer_id: customerId,
				style_id: styleId,
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
		for (const key of ["orders", "dashboard", "customer"]) queryClient.invalidateQueries({ queryKey: [key] });
		toast.success(t("orders.new.created"));
		navigate(`/orders/${data.id}`, { replace: true });
	};

	const filledCount = Object.values(values).filter((v) => v.trim()).length;

	return (
		<div className="mx-auto max-w-3xl space-y-6 pb-24 md:pb-0">
			<Link to="/orders" className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<ArrowLeft className="h-4 w-4" />
				{t("nav.orders")}
			</Link>
			<header>
				<h1 className="font-display text-3xl font-bold">{t("nav.newOrder")}</h1>
				<p className="text-sm text-muted-foreground">
					{t("signup.stepOf", { current: step + 1, total: STEP_KEYS.length })} · {t(`orders.new.steps.${STEP_KEYS[step]}`)}
				</p>
			</header>

			<ol className="grid grid-cols-4 gap-2" aria-label={t("orders.new.progress")}>
				{STEP_KEYS.map((key, i) => (
					<li key={key} aria-current={step === i ? "step" : undefined}>
						<button
							type="button"
							disabled={i > step}
							onClick={() => setStep(i)}
							className="group w-full text-left disabled:cursor-default"
						>
							<span className={cn("block h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
							<span className={cn("mt-2 hidden text-xs font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
								{t(`orders.new.steps.${key}`)}
							</span>
						</button>
					</li>
				))}
			</ol>

			<section className="rounded-2xl border bg-card p-5 sm:p-6">
				{step === 0 && (
					<fieldset className="space-y-4">
						<legend className="sr-only">{t("orders.new.steps.customer")}</legend>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
								<Input
									type="search"
									value={customerQuery}
									onChange={(e) => setCustomerQuery(e.target.value)}
									placeholder={t("customers.search")}
									aria-label={t("customers.search")}
									className="h-12 pl-9"
								/>
							</div>
							<Button type="button" variant="outline" className="h-12" onClick={() => setAddingCustomer(true)}>
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">{t("customers.add")}</span>
								<span className="sr-only sm:hidden">{t("customers.add")}</span>
							</Button>
						</div>
						{loadingCustomers ? (
							<Skeleton className="h-40 w-full rounded-xl" />
						) : customers.length === 0 ? (
							<p className="rounded-xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">{t("orders.new.noCustomers")}</p>
						) : (
							<div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label={t("orders.new.steps.customer")}>
								{customerMatches.map((c) => (
									<label
										key={c.id}
										className={cn(
											"flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											customerId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
										)}
									>
										<input type="radio" name="customer" value={c.id} checked={customerId === c.id} onChange={() => setCustomerId(c.id)} className="sr-only" />
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden>
											{initials(c.name)}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium">{c.name}</span>
											<span className="block truncate text-sm text-muted-foreground">{c.phone ? formatPhone(c.phone) : t("customers.noContact")}</span>
										</span>
										{customerId === c.id && <Check className="h-5 w-5 text-primary" aria-hidden />}
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
						{loadingStyles ? (
							<Skeleton className="h-40 w-full rounded-xl" />
						) : styles.length === 0 ? (
							<div className="rounded-xl bg-muted/60 p-6 text-center">
								<p className="text-sm text-muted-foreground">{t("orders.new.noStyles")}</p>
								<Button variant="outline" className="mt-4" asChild>
									<Link to="/styles">{t("orders.new.createStyle")}</Link>
								</Button>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("orders.new.steps.style")}>
								{styles.map((s) => (
									<label
										key={s.id}
										className={cn(
											"cursor-pointer overflow-hidden rounded-xl border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											styleId === s.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
										)}
									>
										<input
											type="radio"
											name="style"
											value={s.id}
											checked={styleId === s.id}
											onChange={() => {
												setStyleId(s.id);
												setValues({});
												setPrefillNote(undefined);
											}}
											className="sr-only"
										/>
										<span className="flex aspect-[4/3] items-center justify-center bg-muted">
											{s.image_url ? <img src={s.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Shirt className="h-8 w-8 text-muted-foreground" aria-hidden />}
										</span>
										<span className="block p-3">
											<span className="block truncate text-sm font-semibold">{s.name}</span>
											<span className="block text-xs uppercase tracking-wide text-muted-foreground">{s.category}</span>
										</span>
									</label>
								))}
							</div>
						)}
					</fieldset>
				)}

				{step === 2 && (
					<fieldset className="space-y-4">
						<legend className="font-medium">
							{t("orders.new.measureFor", { name: customer?.name ?? "", style: style?.name ?? "" })}
						</legend>
						{prefillNote && <p className="rounded-lg bg-accent-soft p-3 text-sm">{prefillNote}</p>}
						{fields.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("orders.new.noFields")}</p>
						) : (
							<div className="grid gap-3 sm:grid-cols-2">
								{fields.map((f) => (
									<div key={f.key} className="space-y-1.5">
										<Label htmlFor={`m-${f.key}`}>{f.label}</Label>
										<div className="relative">
											<Input
												id={`m-${f.key}`}
												inputMode="decimal"
												value={values[f.key] ?? ""}
												onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
												className="h-12 pr-10 text-right tabular-nums"
											/>
											<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{shop.unit}</span>
										</div>
									</div>
								))}
							</div>
						)}
						<p className="text-xs text-muted-foreground">{t("orders.new.measureHint", { unit: t(`measure.unitName.${shop.unit}`) })}</p>
					</fieldset>
				)}

				{step === 3 && (
					<div className="space-y-5">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="order-price">{t("orders.new.price", { currency: shop.currency })}</Label>
								<Input id="order-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-12 tabular-nums" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="order-date">{t("orders.new.deliveryDate")}</Label>
								<Input id="order-date" type="date" min={today} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-12" />
							</div>
						</div>
						<fieldset className="space-y-1.5">
							<legend className="text-sm font-medium">{t("orders.new.payment")}</legend>
							<div className="grid grid-cols-3 gap-2" role="radiogroup">
								{PAYMENT_STATUSES.map((p) => (
									<label
										key={p}
										className={cn(
											"flex h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
											payment === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
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
						<dl className="grid gap-2 rounded-xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.steps.customer")}</dt>
								<dd className="font-medium">{customer?.name}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.steps.style")}</dt>
								<dd className="font-medium">{style?.name}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.steps.measure")}</dt>
								<dd className="font-medium">{t("orders.new.filled", { count: filledCount, total: fields.length })}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">{t("orders.new.total")}</dt>
								<dd className="font-semibold">{formatMoney(price.trim() ? parseNumber(price) : null, shop.currency, shop.locale)}</dd>
							</div>
						</dl>
					</div>
				)}

				{error && (
					<p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{error}
					</p>
				)}
			</section>

			{/* Actions: sticky above the bottom nav on phones */}
			<div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
				<div className="mx-auto flex max-w-3xl gap-2">
					{step > 0 && (
						<Button type="button" variant="outline" className="h-12" onClick={() => setStep(step - 1)} disabled={saving}>
							<ArrowLeft className="h-4 w-4" />
							{t("signup.back")}
						</Button>
					)}
					{step < STEP_KEYS.length - 1 ? (
						<Button type="button" className="h-12 flex-1 text-base" onClick={next}>
							{t("signup.continue")}
						</Button>
					) : (
						<Button type="button" className="h-12 flex-1 text-base" onClick={create} disabled={saving}>
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
