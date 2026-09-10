import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Clock, Plus, Ruler, Shirt, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMoney, useShop } from "@/lib/shop";
import { cn } from "@/lib/utils";

type RecentOrder = {
	id: string;
	code: string;
	status: string;
	delivery_date: string | null;
	price: number | null;
	created_at: string;
	customers: { name: string } | null;
	styles: { name: string } | null;
};

const STATUS_TONE: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	in_progress: "bg-blue-100 text-blue-800",
	ready: "bg-emerald-100 text-emerald-800",
	delivered: "bg-muted text-muted-foreground",
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Everything the dashboard shows, fetched in parallel (one round trip instead of five). */
function useDashboard() {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["dashboard", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const today = isoDay(new Date());
			const inAWeek = isoDay(new Date(Date.now() + 7 * 86_400_000));
			const count = (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => build(base());
			const base = () => supabase.from("orders").select("id", { count: "exact", head: true });
			const orderColumns = "id, code, status, delivery_date, price, created_at, customers(name), styles(name)";

			const [total, open, dueToday, delivered, customers, styles, recent, dueSoon] = await Promise.all([
				count((q) => q),
				count((q) => q.neq("status", "delivered")),
				count((q) => q.eq("delivery_date", today).neq("status", "delivered")),
				count((q) => q.eq("status", "delivered")),
				supabase.from("customers").select("id", { count: "exact", head: true }),
				supabase.from("styles").select("id", { count: "exact", head: true }),
				supabase.from("orders").select(orderColumns).order("created_at", { ascending: false }).limit(5),
				supabase
					.from("orders")
					.select(orderColumns)
					.neq("status", "delivered")
					.gte("delivery_date", today)
					.lte("delivery_date", inAWeek)
					.order("delivery_date")
					.limit(5),
			]);
			for (const r of [total, open, dueToday, delivered, customers, styles, recent, dueSoon]) if (r.error) throw r.error;
			return {
				total: total.count ?? 0,
				open: open.count ?? 0,
				dueToday: dueToday.count ?? 0,
				delivered: delivered.count ?? 0,
				customers: customers.count ?? 0,
				styles: styles.count ?? 0,
				recent: (recent.data ?? []) as unknown as RecentOrder[],
				dueSoon: (dueSoon.data ?? []) as unknown as RecentOrder[],
			};
		},
	});
}

function OrderList({ orders, empty }: { orders: RecentOrder[]; empty: string }) {
	const { t } = useTranslation();
	const shop = useShop();
	if (orders.length === 0) return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>;
	return (
		<ul className="divide-y">
			{orders.map((o) => (
				<li key={o.id}>
					<Link to="/orders" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium">{o.customers?.name ?? "—"}</p>
							<p className="truncate text-xs text-muted-foreground">
								<span className="font-mono">{o.code}</span> · {o.styles?.name ?? "—"} · {t("dashboard.due", { date: formatDate(o.delivery_date, shop.locale) })}
							</p>
						</div>
						<div className="flex shrink-0 flex-col items-end gap-1">
							<span className="text-sm font-semibold tabular-nums">{formatMoney(o.price, shop.currency, shop.locale)}</span>
							<Badge variant="secondary" className={cn("capitalize", STATUS_TONE[o.status])}>
								{t(`orderStatus.${o.status}`, { defaultValue: o.status.replace("_", " ") })}
							</Badge>
						</div>
					</Link>
				</li>
			))}
		</ul>
	);
}

const Dashboard = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { data, isLoading, isError, refetch } = useDashboard();
	const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
	const firstName = meta.full_name?.split(" ")[0];
	const hour = new Date().getHours();
	const greeting = hour < 12 ? t("dashboard.morning") : hour < 17 ? t("dashboard.afternoon") : t("dashboard.evening");

	useEffect(() => {
		document.title = `${t("nav.home")} · Style2Fit`;
	}, [t]);

	const stats = [
		{ label: t("dashboard.open"), value: data?.open, icon: Clock, tone: "bg-yellow-100 text-yellow-800" },
		{ label: t("dashboard.dueToday"), value: data?.dueToday, icon: CalendarClock, tone: "bg-blue-100 text-blue-800" },
		{ label: t("dashboard.delivered"), value: data?.delivered, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-800" },
		{ label: t("dashboard.customers"), value: data?.customers, icon: UserPlus, tone: "bg-accent-soft text-primary" },
	];

	const steps = data
		? [
				{ done: data.customers > 0, label: t("dashboard.stepCustomer"), to: "/customers", icon: UserPlus },
				{ done: data.styles > 0, label: t("dashboard.stepStyle"), to: "/styles", icon: Shirt },
				{ done: data.total > 0, label: t("dashboard.stepOrder"), to: "/orders?new=1", icon: ClipboardList },
			]
		: [];
	const setupDone = steps.every((s) => s.done);

	return (
		<div className="space-y-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm text-muted-foreground">{meta.business_name ?? "Style2Fit"}</p>
					<h1 className="mt-1 font-display text-3xl font-bold">
						{greeting}
						{firstName ? `, ${firstName}` : ""}
					</h1>
				</div>
				<div className="grid grid-cols-2 gap-2 sm:flex">
					<Button variant="outline" className="h-11" asChild>
						<Link to="/customers">
							<Ruler className="h-4 w-4" />
							{t("dashboard.measure")}
						</Link>
					</Button>
					<Button className="h-11" asChild>
						<Link to="/orders?new=1">
							<Plus className="h-4 w-4" />
							{t("nav.newOrder")}
						</Link>
					</Button>
				</div>
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
					<section aria-label={t("dashboard.summary")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						{stats.map((s) => (
							<div key={s.label} className="rounded-2xl border bg-card p-4">
								<span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", s.tone)} aria-hidden>
									<s.icon className="h-4 w-4" />
								</span>
								{isLoading ? (
									<Skeleton className="mt-3 h-8 w-12" />
								) : (
									<p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.value ?? 0}</p>
								)}
								<p className="text-xs text-muted-foreground">{s.label}</p>
							</div>
						))}
					</section>

					{data && !setupDone && (
						<section className="rounded-2xl border border-accent/40 bg-accent-soft/60 p-5">
							<h2 className="font-display text-xl font-bold">{t("dashboard.setupTitle")}</h2>
							<p className="mt-1 text-sm text-muted-foreground">{t("dashboard.setupBody")}</p>
							<ol className="mt-4 grid gap-2 sm:grid-cols-3">
								{steps.map((s, i) => (
									<li key={s.to}>
										<Link
											to={s.to}
											className={cn(
												"flex h-full items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												s.done && "opacity-70"
											)}
										>
											<span
												className={cn(
													"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
													s.done ? "bg-success text-white" : "bg-primary/10 text-primary"
												)}
												aria-hidden
											>
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

					<div className="grid gap-6 lg:grid-cols-2">
						<section className="overflow-hidden rounded-2xl border bg-card">
							<div className="flex items-center justify-between border-b px-4 py-3">
								<h2 className="font-display text-lg font-bold">{t("dashboard.dueSoon")}</h2>
							</div>
							{isLoading ? <Skeleton className="m-4 h-24" /> : <OrderList orders={data?.dueSoon ?? []} empty={t("dashboard.nothingDue")} />}
						</section>
						<section className="overflow-hidden rounded-2xl border bg-card">
							<div className="flex items-center justify-between border-b px-4 py-3">
								<h2 className="font-display text-lg font-bold">{t("dashboard.recent")}</h2>
								<Link to="/orders" className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
									{t("dashboard.viewAll")}
									<ArrowRight className="h-3.5 w-3.5" />
								</Link>
							</div>
							{isLoading ? <Skeleton className="m-4 h-24" /> : <OrderList orders={data?.recent ?? []} empty={t("dashboard.noOrders")} />}
						</section>
					</div>
				</>
			)}
		</div>
	);
};

export default Dashboard;
