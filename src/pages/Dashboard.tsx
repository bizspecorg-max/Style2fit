import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	ClipboardList,
	Clock,
	CalendarCheck,
	CheckCircle2,
	ArrowRight,
} from "lucide-react";

type Stats = {
	total: number;
	pending: number;
	dueToday: number;
	completed: number;
};

type RecentOrder = {
	id: string;
	code: string;
	status: string;
	delivery_date: string | null;
	customers: { name: string } | null;
	styles: { name: string } | null;
};

const Dashboard = () => {
	const { user } = useAuth();
	const [profileName, setProfileName] = useState("");
	const [stats, setStats] = useState<Stats>({
		total: 0,
		pending: 0,
		dueToday: 0,
		completed: 0,
	});
	const [recent, setRecent] = useState<RecentOrder[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = "Dashboard · Style2Fit";
	}, []);

	useEffect(() => {
		if (!user) return;

		const today = new Date().toISOString().slice(0, 10);

		const fetchData = async () => {
			try {
				// ✅ FIXED: use `id` instead of `user_id` (profiles table uses id = auth.uid())
				const { data: profile } = await supabase
					.from("profiles")
					.select("business_name")
					.eq("id", user.id)
					.maybeSingle();

				setProfileName(profile?.business_name ?? "");

				// Counts (will be 0 if no orders)
				const { count: total } = await supabase
					.from("orders")
					.select("*", { count: "exact", head: true });

				const { count: pending } = await supabase
					.from("orders")
					.select("*", { count: "exact", head: true })
					.eq("status", "pending");

				const { count: dueToday } = await supabase
					.from("orders")
					.select("*", { count: "exact", head: true })
					.eq("delivery_date", today);

				const { count: completed } = await supabase
					.from("orders")
					.select("*", { count: "exact", head: true })
					.eq("status", "delivered");

				setStats({
					total: total ?? 0,
					pending: pending ?? 0,
					dueToday: dueToday ?? 0,
					completed: completed ?? 0,
				});

				// Recent orders (empty array if none)
				const { data: recentData } = await supabase
					.from("orders")
					.select(
						`
            id,
            code,
            status,
            delivery_date,
            customers ( name ),
            styles ( name )
          `
					)
					.order("created_at", { ascending: false })
					.limit(5);

				setRecent((recentData as unknown as RecentOrder[]) ?? []);
			} catch (error) {
				console.error("Dashboard error:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [user]);

	const cards = [
		{
			label: "Total orders",
			value: stats.total,
			icon: ClipboardList,
			tone: "bg-primary/10 text-primary",
		},
		{
			label: "Pending",
			value: stats.pending,
			icon: Clock,
			tone: "bg-yellow-100 text-yellow-700",
		},
		{
			label: "Due today",
			value: stats.dueToday,
			icon: CalendarCheck,
			tone: "bg-blue-100 text-blue-700",
		},
		{
			label: "Completed",
			value: stats.completed,
			icon: CheckCircle2,
			tone: "bg-green-100 text-green-700",
		},
	];

	return (
		<div className="space-y-8 p-4 md:p-6">
			<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-widest text-muted-foreground">
						{profileName || "Welcome"}
					</p>
					<h1 className="font-display text-2xl md:text-3xl font-bold mt-1">
						Today's <span className="text-primary">workshop</span>
					</h1>
				</div>
				<Button asChild className="h-11 w-full sm:w-auto">
					<Link to="/orders?new=1">
						<Plus className="h-4 w-4 mr-1.5" /> New order
					</Link>
				</Button>
			</header>

			{/* Stats Cards - always show, even with zeros */}
			<section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
				{cards.map((c) => (
					<Card key={c.label} className="p-4 shadow-sm">
						<div
							className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.tone}`}
						>
							<c.icon className="h-4.5 w-4.5" />
						</div>
						<div className="mt-3 font-display text-2xl md:text-3xl font-bold">
							{loading ? "—" : c.value}
						</div>
						<div className="text-xs text-muted-foreground mt-0.5">
							{c.label}
						</div>
					</Card>
				))}
			</section>

			{/* Recent Orders Section */}
			<section>
				<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
					<h2 className="font-display text-xl font-bold">Recent orders</h2>
					<Button asChild variant="ghost" size="sm">
						<Link to="/orders">
							View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
						</Link>
					</Button>
				</div>
				<Card className="divide-y overflow-hidden">
					{loading ? (
						<div className="p-6 text-sm text-muted-foreground">Loading…</div>
					) : recent.length === 0 ? (
						<div className="p-8 text-center">
							<p className="text-sm text-muted-foreground mb-4">
								No orders yet. Add a customer and a style to get started.
							</p>
							<div className="flex flex-col sm:flex-row justify-center gap-2">
								<Button asChild variant="outline">
									<Link to="/customers">Add customer</Link>
								</Button>
								<Button asChild>
									<Link to="/styles">Create style</Link>
								</Button>
							</div>
						</div>
					) : (
						recent.map((o) => (
							<Link
								key={o.id}
								to="/orders"
								className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-mono text-xs px-1.5 py-0.5 rounded bg-accent/15">
											{o.code}
										</span>
										<span className="font-medium truncate">
											{o.customers?.name ?? "—"}
										</span>
									</div>
									<div className="text-xs text-muted-foreground mt-0.5 truncate">
										{o.styles?.name ?? "—"}
										{o.delivery_date ? ` · due ${o.delivery_date}` : ""}
									</div>
								</div>
								<Badge variant="secondary" className="capitalize ml-2">
									{o.status?.replace("_", " ") ?? "pending"}
								</Badge>
							</Link>
						))
					)}
				</Card>
			</section>
		</div>
	);
};

export default Dashboard;
