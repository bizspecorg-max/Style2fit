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
  created_at: string;
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_name")
          .eq("id", user.id)
          .maybeSingle();

        setProfileName(profile?.business_name ?? "");

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

        const { data: recentData } = await supabase
          .from("orders")
          .select(
            `
            id,
            code,
            status,
            delivery_date,
            created_at,
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

      {/* Stats Cards */}
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

      {/* Recent Orders Table with Created column */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-xl font-bold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/orders">
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Order code</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Customer</th>
                    <th className="text-left p-3 font-medium">Style</th>
                    <th className="text-left p-3 font-medium">Due date</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recent.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => (window.location.href = "/orders")}
                    >
                      <td className="p-3 font-mono text-xs">{o.code}</td>
                      <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-3">{o.customers?.name ?? "—"}</td>
                      <td className="p-3">{o.styles?.name ?? "—"}</td>
                      <td className="p-3">
                        {o.delivery_date
                          ? new Date(o.delivery_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="capitalize">
                          {o.status?.replace("_", " ") ?? "pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;