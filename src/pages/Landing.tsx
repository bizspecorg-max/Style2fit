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

/** Illustrative preview of the app (sample names, not real data). */
function PhonePreview() {
	const { t } = useTranslation();
	const rows = [
		{ name: "Adaeze O.", style: "Evening gown", img: "photo-1566174053879-31528523f8ae", due: t("landing.preview.inDays"), tone: "in_progress", status: t("orderStatus.in_progress"), price: "₦185,000" },
		{ name: "Tunde B.", style: "Grand agbada", img: "photo-1611312449408-fcece27cdbb7", due: t("landing.preview.tomorrow"), tone: "ready", status: t("orderStatus.ready"), price: "₦240,000" },
		{ name: "Ibrahim M.", style: "Classic senator", img: "photo-1622519407650-3df9883f76a5", due: t("landing.preview.delivered"), tone: "delivered", status: t("orderStatus.delivered"), price: "₦65,000" },
	];
	return (
		<div aria-hidden className="relative mx-auto w-full max-w-[20rem]">
			<div className="absolute -inset-10 rounded-full bg-accent/20 blur-3xl" />
			<div className="relative rounded-[2.5rem] border-[10px] border-[hsl(160_40%_8%)] bg-background p-4 shadow-elevated">
				<div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted" />
				<p className="eyebrow">{t("landing.preview.today")}</p>
				<div className="mt-2 rounded-2xl bg-gradient-hero p-4 text-primary-foreground">
					<p className="font-display text-xl leading-tight">{t("landing.preview.pickups")}</p>
					<p className="mt-1 text-xs text-primary-foreground/70">{t("landing.preview.overdue")}</p>
				</div>
				<div className="mt-3 space-y-2">
					{rows.map((r) => (
						<div key={r.name} className="flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-card">
							<img src={photo(r.img)} alt="" className="h-12 w-10 rounded-lg object-cover" />
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between gap-2">
									<span className="truncate text-sm font-semibold">{r.name}</span>
									<span className="font-display text-sm">{r.price}</span>
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
			<div className="absolute -left-16 top-28 hidden rounded-2xl border bg-card p-3 shadow-elevated sm:block">
				<p className="text-[11px] text-muted-foreground">{t("landing.preview.chest")}</p>
				<p className="font-display text-lg">41 in · 104.1 cm</p>
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
			<header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
					<Logo />
					<nav aria-label={t("landing.navLabel")} className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
						<a href="#features" className="hover:text-foreground">{t("landing.nav.features")}</a>
						<a href="#how" className="hover:text-foreground">{t("landing.nav.how")}</a>
						<a href="#pricing" className="hover:text-foreground">{t("landing.nav.pricing")}</a>
						<a href="#faq" className="hover:text-foreground">{t("landing.nav.faq")}</a>
					</nav>
					<div className="flex items-center gap-2">
						<Button variant="ghost" className="h-10 rounded-full px-4" asChild>
							<Link to="/auth">{t("auth.signIn")}</Link>
						</Button>
						<Button className="h-10 rounded-full px-5" asChild>
							<Link to="/auth?mode=signup">{t("landing.cta")}</Link>
						</Button>
					</div>
				</div>
			</header>

			<main>
				{/* Hero */}
				<section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
					<div>
						<p className="eyebrow text-accent">{t("landing.eyebrow")}</p>
						<h1 className="mt-4 font-display text-5xl leading-[1.02] text-balance sm:text-6xl">{t("landing.title")}</h1>
						<p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("landing.subtitle")}</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Button className="h-12 rounded-full px-7 text-base shadow-soft" asChild>
								<Link to="/auth?mode=signup">
									{t("landing.cta")}
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
							<Button variant="outline" className="h-12 rounded-full bg-card px-7 text-base" asChild>
								<Link to="/auth">{t("landing.haveAccount")}</Link>
							</Button>
						</div>
						<p className="mt-5 text-sm text-muted-foreground">{t("landing.trust")}</p>
					</div>
					<PhonePreview />
				</section>

				{/* Features */}
				<section id="features" className="border-y bg-card/60 py-20">
					<div className="mx-auto max-w-6xl px-5">
						<p className="eyebrow text-accent">{t("landing.nav.features")}</p>
						<h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight">{t("landing.featuresTitle")}</h2>
						<div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
							{features.map((f) => (
								<article key={f.title} className="rounded-3xl border bg-card p-6 shadow-card">
									<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
										<f.icon className="h-5 w-5" aria-hidden />
									</span>
									<h3 className="mt-5 font-display text-xl">{f.title}</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* How it works */}
				<section id="how" className="mx-auto max-w-6xl px-5 py-20">
					<p className="eyebrow text-accent">{t("landing.nav.how")}</p>
					<h2 className="mt-3 font-display text-4xl">{t("landing.howTitle")}</h2>
					<ol className="mt-12 grid gap-6 md:grid-cols-3">
						{steps.map((s, i) => (
							<li key={s} className="relative rounded-3xl border bg-card p-6 shadow-card">
								<span className="font-display text-5xl text-accent/40">0{i + 1}</span>
								<p className="mt-3 text-base leading-relaxed">{s}</p>
							</li>
						))}
					</ol>
				</section>

				{/* Pricing */}
				<section id="pricing" className="bg-gradient-hero py-20 text-primary-foreground">
					<div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
						<div>
							<p className="eyebrow text-primary-foreground/60">{t("landing.nav.pricing")}</p>
							<h2 className="mt-3 font-display text-4xl leading-tight">{t("landing.pricing.title")}</h2>
							<p className="mt-4 max-w-md text-primary-foreground/75">{t("landing.pricing.body")}</p>
						</div>
						<div className="hairline-gold rounded-3xl bg-white/5 p-7 ring-1 ring-white/10 backdrop-blur">
							<p className="eyebrow text-primary-foreground/60">{t("landing.pricing.plan")}</p>
							<p className="mt-3 font-display text-5xl">
								₦5,000<span className="text-lg text-primary-foreground/60"> / {t("profile.month")}</span>
							</p>
							<p className="mt-1 text-sm text-primary-foreground/70">{t("landing.pricing.trial")}</p>
							<ul className="mt-6 space-y-3 text-sm">
								{included.map((i) => (
									<li key={i} className="flex items-start gap-3">
										<Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
										{i}
									</li>
								))}
							</ul>
							<Button className="mt-8 h-12 w-full rounded-full bg-accent text-base text-accent-foreground shadow-gold hover:bg-accent/90" asChild>
								<Link to="/auth?mode=signup">{t("landing.cta")}</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section id="faq" className="mx-auto max-w-3xl px-5 py-20">
					<p className="eyebrow text-accent">{t("landing.nav.faq")}</p>
					<h2 className="mt-3 font-display text-4xl">{t("landing.faqTitle")}</h2>
					<div className="mt-10 divide-y rounded-3xl border bg-card shadow-card">
						{faqs.map((f) => (
							<details key={f.q} className="group p-5 sm:p-6">
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
									{f.q}
									<span className="text-xl text-accent transition-transform group-open:rotate-45" aria-hidden>
										+
									</span>
								</summary>
								<p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
							</details>
						))}
					</div>
				</section>

				<section className="mx-auto max-w-6xl px-5 pb-24">
					<div className="rounded-3xl border bg-card p-8 text-center shadow-card sm:p-12">
						<h2 className="font-display text-3xl sm:text-4xl">{t("landing.finalTitle")}</h2>
						<p className="mt-3 text-muted-foreground">{t("landing.trust")}</p>
						<Button className="mt-8 h-12 rounded-full px-8 text-base" asChild>
							<Link to="/auth?mode=signup">
								{t("landing.cta")}
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</section>
			</main>

			<footer className="border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
					<Logo size="sm" />
					<a href={whatsappLink(SUPPORT_PHONE, "Hello Style2Fit!")} target="_blank" rel="noreferrer" className="hover:text-foreground">
						{t("landing.support")}
					</a>
					<p>© {new Date().getFullYear()} Style2Fit</p>
				</div>
			</footer>
		</div>
	);
};

export default Landing;
