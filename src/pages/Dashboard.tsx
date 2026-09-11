import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, Plus, Ruler, Scissors, Shirt, UserPlus, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OrderRow } from "@/components/OrderRow";
import { SectionTitle } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_SELECT, isOverdue, type Order } from "@/lib/orders";
import { daysUntil, formatMoney, useShop } from "@/lib/shop";
import { cn } from "@/lib/utils";

/** Open orders plus a few counts, fetched in parallel (one round trip). */
function useDashboard() {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["dashboard", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });
			const [open, delivered, customers, styles] = await Promise.all([
				supabase.from("orders").select(ORDER_SELECT).neq("status", "delivered").order("delivery_date", { ascending: true, nullsFirst: false }),
				head("orders").eq("status", "delivered"),
				head("customers"),
				head("styles"),
			]);
			for (const r of [open, delivered, customers, styles]) if (r.error) throw r.error;
			return {
				open: (open.data ?? []) as unknown as Order[],
				delivered: delivered.count ?? 0,
				customers: customers.count ?? 0,
				styles: styles.count ?? 0,
			};
		},
	});
}

const Dashboard = () => {
	const { t, i18n } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const { data, isLoading, isError, refetch } = useDashboard();
	const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
	const firstName = meta.full_name?.split(" ")[0];
	const hour = new Date().getHours();
	const greeting = hour < 12 ? t("dashboard.morning") : hour < 17 ? t("dashboard.afternoon") : t("dashboard.evening");
	const today = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

	useEffect(() => {
		document.title = `${t("nav.home")} · Style2Fit`;
	}, [t]);

	const open = data?.open ?? [];
	const overdue = open.filter(isOverdue);
	const dueToday = open.filter((o) => o.delivery_date && daysUntil(o.delivery_date) === 0);
	const thisWeek = open.filter((o) => o.delivery_date && daysUntil(o.delivery_date) >= 0 && daysUntil(o.delivery_date) <= 7);
	const ready = open.filter((o) => o.status === "ready");
	const openValue = open.reduce((sum, o) => sum + (o.price ?? 0), 0);
	const awaitingPayment = open.filter((o) => o.payment_status !== "paid").length;
	const upNext = [...overdue, ...open.filter((o) => !isOverdue(o))].slice(0, 5);

	const stats = [
		{ label: t("dashboard.open"), value: open.length, icon: Scissors },
		{ label: t("dashboard.ready"), value: ready.length, icon: PackageCheck },
		{ label: t("dashboard.delivered"), value: data?.delivered ?? 0, icon: CheckCircle2 },
		{ label: t("dashboard.customers"), value: data?.customers ?? 0, icon: Users },
	];

	const steps = data
		? [
				{ done: data.customers > 0, label: t("dashboard.stepCustomer"), to: "/customers", icon: UserPlus },
				{ done: data.styles > 0, label: t("dashboard.stepStyle"), to: "/styles", icon: Shirt },
				{ done: open.length + data.delivered > 0, label: t("dashboard.stepOrder"), to: "/orders/new", icon: ClipboardList },
			]
		: [];
	const setupDone = steps.every((s) => s.done);

	const heroLine =
		overdue.length || dueToday.length
			? [overdue.length ? t("dashboard.overdueCount", { count: overdue.length }) : null, dueToday.length ? t("dashboard.dueTodayCount", { count: dueToday.length }) : null]
					.filter(Boolean)
					.join(" · ")
			: t("dashboard.allClear");

	return (
		<div className="space-y-8">
			<header>
				<p className="eyebrow">{today}</p>
				<h1 className="mt-1.5 font-display text-3xl sm:text-4xl">
					{greeting}
					{firstName ? `, ${firstName}` : ""}
				</h1>
			</header>

			{isError ? (
				<div className="rounded-2xl border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
					<Button variant="outline" className="mt-4" onClick={() => refetch()}>
						{t("common.retry")}
					</Button>
				</div>
			) : (
				<>
					{/* Today */}
					<section className="hairline-gold relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8">
						<div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-2xl" aria-hidden />
						<p className="eyebrow text-primary-foreground/60">{meta.business_name ?? "Style2Fit"}</p>
						{isLoading ? (
							<Skeleton className="mt-3 h-10 w-64 bg-white/10" />
						) : (
							<>
								<p className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{t("dashboard.pickups", { count: thisWeek.length })}</p>
								<p className={cn("mt-2 text-sm", overdue.length ? "text-[hsl(40_80%_70%)]" : "text-primary-foreground/70")}>{heroLine}</p>
							</>
						)}
						<div className="mt-6 flex flex-wrap gap-2">
							<Button className="h-11 rounded-full bg-accent px-5 text-accent-foreground shadow-gold hover:bg-accent/90" asChild>
								<Link to="/orders/new">
									<Plus className="h-4 w-4" />
									{t("nav.newOrder")}
								</Link>
							</Button>
							<Button variant="ghost" className="h-11 rounded-full border border-white/20 px-5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" asChild>
								<Link to="/quick-measure">
									<Ruler className="h-4 w-4" />
									{t("dashboard.measure")}
								</Link>
							</Button>
						</div>
					</section>

					{/* Stats */}
					<section aria-label={t("dashboard.summary")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						{stats.map((s) => (
							<div key={s.label} className="rounded-2xl border bg-card p-4 shadow-card">
								<div className="flex items-center justify-between">
									<p className="text-xs font-medium text-muted-foreground">{s.label}</p>
									<s.icon className="h-4 w-4 text-accent" aria-hidden />
								</div>
								{isLoading ? <Skeleton className="mt-2 h-8 w-10" /> : <p className="mt-2 font-display text-3xl tabular-nums">{s.value}</p>}
							</div>
						))}
					</section>

					{data && !setupDone && (
						<section className="rounded-3xl border border-accent/30 bg-accent-soft/60 p-5 sm:p-6">
							<h2 className="font-display text-xl">{t("dashboard.setupTitle")}</h2>
							<p className="mt-1 text-sm text-muted-foreground">{t("dashboard.setupBody")}</p>
							<ol className="mt-4 grid gap-2 sm:grid-cols-3">
								{steps.map((s, i) => (
									<li key={s.to}>
										<Link
											to={s.to}
											className={cn(
												"flex h-full items-center gap-3 rounded-2xl border bg-card p-3 text-sm shadow-card transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												s.done && "opacity-60"
											)}
										>
											<span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", s.done ? "bg-success text-white" : "bg-primary/10 text-primary")} aria-hidden>
												{s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
											</span>
											<span className={cn("font-medium", s.done && "line-through")}>{s.label}</span>
											{!s.done && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />}
										</Link>
									</li>
								))}
							</ol>
						</section>
					)}

					<div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
						<section>
							<SectionTitle
								action={
									<Link to="/orders" className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
										{t("dashboard.viewAll")}
										<ArrowRight className="h-3.5 w-3.5" />
									</Link>
								}
							>
								{t("dashboard.upNext")}
							</SectionTitle>
							{isLoading ? (
								<div className="space-y-3">
									<Skeleton className="h-24 rounded-2xl" />
									<Skeleton className="h-24 rounded-2xl" />
								</div>
							) : upNext.length === 0 ? (
								<p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{t("dashboard.upNextEmpty")}</p>
							) : (
								<ul className="space-y-3">
									{upNext.map((o) => (
										<li key={o.id}>
											<OrderRow order={o} />
										</li>
									))}
								</ul>
							)}
						</section>

						<section aria-label={t("dashboard.moneyTitle")} className="h-fit rounded-3xl border bg-card p-5 shadow-card">
							<div className="flex items-center gap-2">
								<Wallet className="h-4 w-4 text-accent" aria-hidden />
								<h2 className="eyebrow">{t("dashboard.moneyTitle")}</h2>
							</div>
							{isLoading ? (
								<Skeleton className="mt-3 h-9 w-40" />
							) : (
								<>
									<p className="mt-3 font-display text-3xl tabular-nums">{formatMoney(openValue, shop.currency, shop.locale)}</p>
									<p className="mt-1 text-sm text-muted-foreground">{t("dashboard.openValue")}</p>
									<div className="mt-4 border-t pt-4 text-sm">
										<Link to="/orders" className="flex items-center justify-between rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
											<span>{t("dashboard.awaitingPayment", { count: awaitingPayment })}</span>
											<ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
										</Link>
									</div>
								</>
							)}
						</section>
					</div>
				</>
			)}
		</div>
	);
};

export default Dashboard;
