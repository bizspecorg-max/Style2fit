import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MeasurementField,
  TEMPLATES,
  Category,
} from "@/lib/measurementTemplates";

type Customer = { id: string; name: string; phone: string };
type Style = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  measurement_template: MeasurementField[];
};
type Order = {
  id: string;
  code: string;
  status: string;
  payment_status: string;
  delivery_date: string | null;
  price: number | null;
  notes: string | null;
  measurement_values: Record<string, string>;
  customer_id: string;
  style_id: string | null;
  customers: { name: string; phone: string } | null;
  styles: { name: string; image_url: string | null } | null;
  created_at: string; // ✅ added
};

const STATUSES = ["pending", "in_progress", "ready", "delivered"] as const;
const PAYMENTS = ["unpaid", "part_payment", "paid"] as const;

const Orders = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  // form
  const [styleId, setStyleId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [createNew, setCreateNew] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>("pending");
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Orders · Style2Fit";
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [oRes, cRes, sRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, code, status, payment_status, delivery_date, price, notes, measurement_values, customer_id, style_id, customers(name, phone), styles(name, image_url), created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name, phone").order("name"),
      supabase
        .from("styles")
        .select("id, name, category, image_url, measurement_template")
        .order("name"),
    ]);
    setOrders((oRes.data as unknown as Order[]) ?? []);
    setCustomers((cRes.data as Customer[]) ?? []);
    setStyles((sRes.data as unknown as Style[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const selectedStyle = useMemo(
    () => styles.find((s) => s.id === styleId) ?? null,
    [styles, styleId]
  );
  const fields: MeasurementField[] = selectedStyle?.measurement_template?.length
    ? selectedStyle.measurement_template
    : selectedStyle
      ? (TEMPLATES[selectedStyle.category as Category] ?? [])
      : [];

  // Open from query param (?new=1&style=ID)
  useEffect(() => {
    if (params.get("new") === "1") {
      const sid = params.get("style") ?? "";
      openNew(sid);
      params.delete("new");
      params.delete("style");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, styles.length]);

  const openNew = (preselectStyle = "") => {
    setStyleId(preselectStyle);
    setCustomerId("");
    setCreateNew(false);
    setNewCustomer({ name: "", phone: "" });
    setValues({});
    setStatus("pending");
    setPaymentStatus("unpaid");
    setDeliveryDate("");
    setPrice("");
    setNotes("");
    setOpen(true);
  };

  const save = async () => {
    const orderSchema = z.object({
      styleId: z.string().min(1, "Select a style"),
      deliveryDate: z.string().optional(),
      price: z.string().optional(),
    });
    const parsed = orderSchema.safeParse({ styleId, deliveryDate, price });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    let cid = customerId;
    setSaving(true);
    try {
      if (createNew) {
        const ncSchema = z.object({
          name: z.string().trim().min(1).max(100),
          phone: z.string().trim().min(7).max(20),
        });
        const np = ncSchema.safeParse(newCustomer);
        if (!np.success) {
          toast.error("Customer name & phone required");
          setSaving(false);
          return;
        }
        const { data, error } = await supabase
          .from("customers")
          .insert([
            { name: np.data.name, phone: np.data.phone, user_id: user!.id },
          ])
          .select("id")
          .single();
        if (error) throw error;
        cid = data.id;
      }
      if (!cid) {
        toast.error("Choose or create a customer");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("orders").insert({
        user_id: user!.id,
        customer_id: cid,
        style_id: styleId,
        measurement_values: values,
        image_url: selectedStyle?.image_url ?? null,
        status: status as Order["status"],
        payment_status: paymentStatus as Order["payment_status"],
        delivery_date: deliveryDate || null,
        price: price ? Number(price) : null,
        notes: notes || null,
        code: "", // trigger will fill
      } as never);
      if (error) throw error;
      toast.success("Order saved");
      setOpen(false);
      loadAll();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateOrder = async (id: string, patch: Partial<Order>) => {
    const { error } = await supabase
      .from("orders")
      .update(patch as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadAll();
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    const s = q.toLowerCase();
    return (
      !s ||
      o.code.toLowerCase().includes(s) ||
      (o.customers?.name ?? "").toLowerCase().includes(s) ||
      (o.styles?.name ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total</p>
        </div>
        <Button onClick={() => openNew()} className="h-11">
          <Plus className="h-4 w-4 mr-1.5" /> New order
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, customer, style"
            className="pl-9 h-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No orders found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Order code</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Style</th>
                  <th className="text-left p-3 font-medium">Status & Payment</th>
                  <th className="text-left p-3 font-medium">Due date</th>
                  <th className="text-right p-3 font-medium">Price</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{o.code}</td>
                    <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{o.customers?.name ?? "—"}</td>
                    <td className="p-3">{o.styles?.name ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <Select
                          value={o.status}
                          onValueChange={(v) =>
                            updateOrder(o.id, { status: v as Order["status"] })
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={o.payment_status}
                          onValueChange={(v) =>
                            updateOrder(o.id, {
                              payment_status: v as Order["payment_status"],
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENTS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="p-3">
                      {o.delivery_date
                        ? new Date(o.delivery_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {o.price ? `₦${o.price.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => remove(o.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New order modal – unchanged */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Style *</Label>
              <Select value={styleId} onValueChange={setStyleId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pick a style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No styles yet — create one first.
                    </div>
                  )}
                  {styles.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStyle?.image_url && (
              <img
                src={selectedStyle.image_url}
                alt=""
                className="w-full h-44 object-cover rounded-lg"
              />
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Customer *</Label>
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => setCreateNew((v) => !v)}
                >
                  {createNew ? "Pick existing" : "+ New customer"}
                </button>
              </div>
              {createNew ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name"
                    className="h-11"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Phone"
                    className="h-11"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                  />
                </div>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Pick a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No customers yet.
                      </div>
                    )}
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {fields.length > 0 && (
              <div className="space-y-2">
                <Label>Measurements</Label>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label
                        htmlFor={f.key}
                        className="text-xs text-muted-foreground"
                      >
                        {f.label}
                      </Label>
                      <Input
                        id={f.key}
                        inputMode="decimal"
                        className="h-11"
                        value={values[f.key] ?? ""}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Delivery date</Label>
                <Input
                  type="date"
                  className="h-11"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price (₦)</Label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  className="h-11"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENTS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={save}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;