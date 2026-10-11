import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Globe2, MessageCircle, Ruler, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/shop";

const SUPPORT_PHONE = "+2347035599433";
const photo = (id: string) => `https://images.unsplash.com/${id}?w=240&q=70&auto=format&fit=crop`;

/** A chalk mark before a section label — the same rule that opens every section. */
function Eyebrow({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "light" }) {
	return (
		<p className={`eyebrow flex items-center gap-3 ${tone === "light" ? "text-primary-foreground/60" : "text-accent"}`}>
			<span aria-hidden className={`h-px w-7 ${tone === "light" ? "bg-primary-foreground/30" : "bg-accent/50"}`} />
			{children}
		</p>
	);
}

/** Illustrative preview of the app (sample names, not real data). */
function PhonePreview() {
	const { t } = useTranslation();
	const rows = [
		{ name: "Adaeze O.", style: "Evening gown", img: "photo-1566174053879-31528523f8ae", due: t("landing.preview.inDays"), tone: "in_progress", status: t("orderStatus.in_progress"), price: "₦185,000" },
		{ name: "Tunde B.", style: "Grand agbada", img: "photo-1611312449408-fcece27cdbb7", due: t("landing.preview.tomorrow"), tone: "ready", status: t("orderStatus.ready"), price: "₦240,000" },
		{ name: "Ibrahim M.", style: "Classic senator", img: "photo-1622519407650-3df9883f76a5", due: t("landing.preview.delivered"), tone: "delivered", status: t("orderStatus.delivered"), price: "₦65,000" },
	];
	return (
		<div aria-hidden className="relative mx-auto w-full max-w-[19rem]">
			<div className="pointer-events-none absolute inset-x-0 -inset-y-12 rounded-full bg-accent/10 blur-3xl" />
			{/* A slim bezel. The old 10px one made the mock read as a toy phone. */}
			<div className="relative rounded-[1.75rem] border-[6px] border-[hsl(158_45%_7%)] bg-background p-3.5 shadow-elevated">
				<div className="mx-auto mb-3.5 h-1 w-14 rounded-full bg-muted" />
				<p className="eyebrow">{t("landing.preview.today")}</p>
				<div className="mt-2 rounded-md bg-gradient-hero p-4 text-primary-foreground">
					<p className="font-display text-xl leading-tight">{t("landing.preview.pickups")}</p>
					<p className="mt-1 text-xs text-primary-foreground/70">{t("landing.preview.overdue")}</p>
				</div>
				<div className="mt-3 space-y-2">
					{rows.map((r) => (
						<div key={r.name} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
							<img
								src={photo(r.img)}
								alt=""
								loading="lazy"
								onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
								className="h-12 w-10 rounded-sm bg-muted object-cover"
							/>
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between gap-2">
									<span className="truncate text-sm font-semibold">{r.name}</span>
									<span className="numeral text-sm">{r.price}</span>
								</div>
								<p className="truncate text-[11px] text-muted-foreground">{r.style}</p>
								<div className="mt-1 flex items-center justify-between">
									<span className="text-[11px] text-muted-foreground">{r.due}</span>
									<StatusPill tone={r.tone} className="px-2 py-0 text-[10px]">
										{r.status}
									</StatusPill>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="absolute -left-[8rem] top-36 hidden rounded-md border bg-card p-3 shadow-elevated lg:block">
				<p className="text-[11px] text-muted-foreground">{t("landing.preview.chest")}</p>
				<p className="numeral mt-0.5 text-lg">41 in · 104.1 cm</p>
			</div>
		</div>
	);
}

const Landing = () => {
	const { t } = useTranslation();

	useEffect(() => {
		document.title = "Style2Fit · Digital measurement book for tailors";
	}, []);

	const features = [
		{ icon: Ruler, title: t("landing.features.measureTitle"), body: t("landing.features.measureBody") },
		{ icon: Sparkles, title: t("landing.features.ordersTitle"), body: t("landing.features.ordersBody") },
		{ icon: MessageCircle, title: t("landing.features.whatsappTitle"), body: t("landing.features.whatsappBody") },
		{ icon: Globe2, title: t("landing.features.globalTitle"), body: t("landing.features.globalBody") },
		{ icon: Smartphone, title: t("landing.features.deviceTitle"), body: t("landing.features.deviceBody") },
		{ icon: ShieldCheck, title: t("landing.features.privateTitle"), body: t("landing.features.privateBody") },
	];
	const steps = [t("landing.steps.one"), t("landing.steps.two"), t("landing.steps.three")];
	const faqs = ["units", "phone", "trial", "share"].map((k) => ({ q: t(`landing.faq.${k}Q`), a: t(`landing.faq.${k}A`) }));
	const included = [t("landing.pricing.i1"), t("landing.pricing.i2"), t("landing.pricing.i3"), t("landing.pricing.i4"), t("landing.pricing.i5")];

	return (
		<div className="min-h-dvh bg-background">
			<header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
					<Logo />
					<nav aria-label={t("landing.navLabel")} className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
						<a href="#features" className="transition-colors hover:text-foreground">{t("landing.nav.features")}</a>
						<a href="#how" className="transition-colors hover:text-foreground">{t("landing.nav.how")}</a>
						<a href="#pricing" className="transition-colors hover:text-foreground">{t("landing.nav.pricing")}</a>
						<a href="#faq" className="transition-colors hover:text-foreground">{t("landing.nav.faq")}</a>
					</nav>
					<div className="flex items-center gap-1.5">
						<Button variant="ghost" className="h-10 px-4" asChild>
							<Link to="/auth">{t("auth.signIn")}</Link>
						</Button>
						<Button className="h-10 px-5" asChild>
							<Link to="/auth?mode=signup">{t("landing.cta")}</Link>
						</Button>
					</div>
				</div>
			</header>

			<main>
				{/* Hero */}
				<section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-14 md:grid-cols-[1.08fr_1fr] md:pt-20">
					<div>
						<Eyebrow>{t("landing.eyebrow")}</Eyebrow>
						<h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.06] text-balance sm:text-[3.25rem]">{t("landing.title")}</h1>
						<p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">{t("landing.subtitle")}</p>
						<div className="mt-9 flex flex-col gap-3 sm:flex-row">
							<Button className="h-12 px-7 text-base" asChild>
								<Link to="/auth?mode=signup">
									{t("landing.cta")}
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
							<Button variant="outline" className="h-12 bg-card px-7 text-base" asChild>
								<Link to="/auth">{t("landing.haveAccount")}</Link>
							</Button>
						</div>
						<p className="mt-7 border-t pt-4 text-sm text-muted-foreground">{t("landing.trust")}</p>
					</div>
					<PhonePreview />
				</section>

				{/* Features */}
				<section id="features" className="border-y bg-card/50 py-24">
					<div className="mx-auto max-w-6xl px-5">
						<Eyebrow>{t("landing.nav.features")}</Eyebrow>
						<h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.12]">{t("landing.featuresTitle")}</h2>
						{/* Hairlines, not cards: six boxes with six shadows flattened the page. */}
						<div className="mt-14 grid gap-x-10 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
							{features.map((f) => (
								<article key={f.title} className="border-t pt-6">
									<f.icon className="h-5 w-5 text-accent" aria-hidden strokeWidth={1.5} />
									<h3 className="mt-4 text-[1.0625rem] font-semibold tracking-[-0.01em]">{f.title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* How it works — a real sequence, so it is numbered. */}
				<section id="how" className="mx-auto max-w-6xl px-5 py-24">
					<Eyebrow>{t("landing.nav.how")}</Eyebrow>
					<h2 className="mt-4 font-display text-4xl font-semibold">{t("landing.howTitle")}</h2>
					<ol className="mt-14 grid gap-x-10 gap-y-10 md:grid-cols-3">
						{steps.map((s, i) => (
							<li key={s} className="border-t pt-6">
								<span className="numeral text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
								<p className="mt-3 text-base leading-relaxed">{s}</p>
							</li>
						))}
					</ol>
				</section>

				{/* Pricing */}
				<section id="pricing" className="bg-gradient-hero py-24 text-primary-foreground">
					<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
						<div>
							<Eyebrow tone="light">{t("landing.nav.pricing")}</Eyebrow>
							<h2 className="mt-4 font-display text-4xl font-semibold leading-[1.12]">{t("landing.pricing.title")}</h2>
							<p className="mt-5 max-w-md leading-relaxed text-primary-foreground/75">{t("landing.pricing.body")}</p>
						</div>
						<div className="hairline-gold rounded-md bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur">
							<Eyebrow tone="light">{t("landing.pricing.plan")}</Eyebrow>
							<p className="numeral mt-4 text-5xl">
								₦5,000<span className="font-sans text-base font-normal text-primary-foreground/60"> / {t("profile.month")}</span>
							</p>
							<p className="mt-2 text-sm text-primary-foreground/70">{t("landing.pricing.trial")}</p>
							<ul className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm">
								{included.map((i) => (
									<li key={i} className="flex items-start gap-3">
										<Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" aria-hidden strokeWidth={2} />
										{i}
									</li>
								))}
							</ul>
							<Button className="mt-8 h-12 w-full bg-accent-bright text-base font-semibold text-accent-foreground hover:bg-accent-bright/90" asChild>
								<Link to="/auth?mode=signup">{t("landing.cta")}</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section id="faq" className="mx-auto max-w-3xl px-5 py-24">
					<Eyebrow>{t("landing.nav.faq")}</Eyebrow>
					<h2 className="mt-4 font-display text-4xl font-semibold">{t("landing.faqTitle")}</h2>
					<div className="mt-12 divide-y border-y">
						{faqs.map((f) => (
							<details key={f.q} className="group py-5">
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
									{f.q}
									<span className="text-xl font-light text-accent transition-transform group-open:rotate-45" aria-hidden>
										+
									</span>
								</summary>
								<p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{f.a}</p>
							</details>
						))}
					</div>
				</section>

				<section className="mx-auto max-w-6xl px-5 pb-28">
					<div className="border-t pt-16 text-center">
						<h2 className="font-display text-3xl font-semibold sm:text-4xl">{t("landing.finalTitle")}</h2>
						<p className="mt-4 text-muted-foreground">{t("landing.trust")}</p>
						<Button className="mt-9 h-12 px-8 text-base" asChild>
							<Link to="/auth?mode=signup">
								{t("landing.cta")}
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</section>
			</main>

			<footer className="border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-9 text-sm text-muted-foreground sm:flex-row">
					<Logo size="sm" />
					<a href={whatsappLink(SUPPORT_PHONE, "Hello Style2Fit!")} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
						{t("landing.support")}
					</a>
					<p>© {new Date().getFullYear()} Style2Fit</p>
				</div>
			</footer>
		</div>
	);
};

export default Landing;
