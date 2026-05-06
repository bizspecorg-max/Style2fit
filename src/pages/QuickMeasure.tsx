import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash2, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

type Customer = { id: string; name: string };
type MeasurementField = { key: string; label: string; unit: string };
type Measurement = {
	id: string;
	title: string;
	fields: MeasurementField[];
	values: Record<string, string>;
	created_at: string;
	customers: { name: string } | null;
};

// Default measurement fields (like in Styles modal)
const DEFAULT_FIELDS: MeasurementField[] = [
	{ key: "chest", label: "Chest", unit: "inches" },
	{ key: "waist", label: "Waist", unit: "inches" },
	{ key: "hip", label: "Hip", unit: "inches" },
	{ key: "length", label: "Length", unit: "inches" },
	// Add more defaults as needed
];

const QuickMeasure = () => {
	const { user } = useAuth();
	const [measurements, setMeasurements] = useState<Measurement[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [viewOpen, setViewOpen] = useState(false);
	const [viewing, setViewing] = useState<Measurement | null>(null);
	const [saving, setSaving] = useState(false);

	// Form state
	const [title, setTitle] = useState("");
	const [customerId, setCustomerId] = useState("");
	const [fields, setFields] = useState<MeasurementField[]>(DEFAULT_FIELDS);
	const [values, setValues] = useState<Record<string, string>>({});

	// New customer modal state
	const [newCustomerOpen, setNewCustomerOpen] = useState(false);
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");

	useEffect(() => {
		document.title = "Quick Measure · Style2Fit";
		if (user) loadData();
	}, [user]);

	const loadData = async () => {
		if (!user) return;
		setLoading(true);
		const [measRes, custRes] = await Promise.all([
			supabase
				.from("measurements")
				.select("id, title, fields, values, created_at, customers(name)")
				.order("created_at", { ascending: false }),
			supabase.from("customers").select("id, name").order("name"),
		]);
		setMeasurements((measRes.data as unknown as Measurement[]) ?? []);
		setCustomers((custRes.data as Customer[]) ?? []);
		setLoading(false);
	};

	const resetForm = () => {
		setTitle("");
		setCustomerId("");
		setFields(DEFAULT_FIELDS);
		setValues({});
	};

	const openNew = () => {
		resetForm();
		setOpen(true);
	};

	const addField = () => {
		const newKey = `field_${Date.now()}_${fields.length}`;
		setFields([...fields, { key: newKey, label: "", unit: "inches" }]);
	};

	const updateField = (idx: number, label: string) => {
		const updated = [...fields];
		updated[idx].label = label;
		setFields(updated);
	};

	const removeField = (idx: number) => {
		const newFields = fields.filter((_, i) => i !== idx);
		setFields(newFields);
		const newValues = { ...values };
		delete newValues[fields[idx].key];
		setValues(newValues);
	};

	const createNewCustomer = async () => {
		if (!newCustomerName.trim()) {
			toast.error("Customer name required");
			return;
		}
		const { data, error } = await supabase
			.from("customers")
			.insert({
				name: newCustomerName.trim(),
				phone: newCustomerPhone || null,
				user_id: user!.id,
			})
			.select("id")
			.single();
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Customer created");
		setNewCustomerOpen(false);
		setNewCustomerName("");
		setNewCustomerPhone("");
		await loadData();
		setCustomerId(data.id);
	};

	const save = async () => {
		if (!customerId) {
			toast.error("Select a customer");
			return;
		}
		if (!title.trim()) {
			toast.error("Enter a title");
			return;
		}
		if (fields.length === 0) {
			toast.error("Add at least one measurement field");
			return;
		}
		const missing = fields.some((f) => !f.label.trim());
		if (missing) {
			toast.error("All fields must have a label");
			return;
		}
		setSaving(true);
		const { error } = await supabase.from("measurements").insert({
			user_id: user!.id,
			customer_id: customerId,
			title: title.trim(),
			fields,
			values,
		});
		setSaving(false);
		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Measurement saved");
			setOpen(false);
			loadData();
		}
	};

	const remove = async (id: string) => {
		if (!confirm("Delete this measurement?")) return;
		const { error } = await supabase.from("measurements").delete().eq("id", id);
		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Deleted");
			loadData();
		}
	};

	const viewMeasurement = (m: Measurement) => {
		setViewing(m);
		setViewOpen(true);
	};

	return (
		<div className="space-y-5 p-4 md:p-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="font-display text-3xl font-bold">Quick Measure</h1>
					<p className="text-sm text-muted-foreground">
						Measurements without a style
					</p>
				</div>
				<Button onClick={openNew} className="h-11">
					<Plus className="h-4 w-4 mr-1.5" /> New
				</Button>
			</header>

			{/* Table of measurements (unchanged) */}
			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : measurements.length === 0 ? (
				<Card className="p-10 text-center">
					<p className="text-sm text-muted-foreground">
						No measurements yet. Click "New" to create one.
					</p>
				</Card>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 border-b">
							<tr>
								<th className="text-left p-3 font-medium">Title</th>
								<th className="text-left p-3 font-medium">Customer</th>
								<th className="text-left p-3 font-medium">Fields</th>
								<th className="text-left p-3 font-medium">Created</th>
								<th className="text-center p-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{measurements.map((m) => (
								<tr key={m.id} className="hover:bg-muted/30 transition-colors">
									<td className="p-3 font-medium">{m.title}</td>
									<td className="p-3">{m.customers?.name ?? "—"}</td>
									<td className="p-3 text-xs text-muted-foreground">
										{Object.keys(m.values).length} entries
									</td>
									<td className="p-3 text-xs">
										{new Date(m.created_at).toLocaleDateString()}
									</td>
									<td className="p-3 text-center">
										<div className="flex justify-center gap-1">
											<Button
												size="icon"
												variant="ghost"
												onClick={() => viewMeasurement(m)}
												className="h-8 w-8"
											>
												<Eye className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => remove(m.id)}
												className="h-8 w-8"
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* New Measurement Modal – now matches Orders & Styles */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New measurement</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{/* Customer selector – using shadcn Select (like Orders) */}
						<div className="space-y-1.5">
							<Label>Customer *</Label>
							<div className="flex gap-2">
								<Select value={customerId} onValueChange={setCustomerId}>
									<SelectTrigger className="flex-1 h-11">
										<SelectValue placeholder="Pick a customer" />
									</SelectTrigger>
									<SelectContent>
										{customers.length === 0 && (
											<div className="px-2 py-1.5 text-sm text-muted-foreground">
												No customers yet. Create one first.
											</div>
										)}
										{customers.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="outline"
									onClick={() => setNewCustomerOpen(true)}
									className="h-11 px-3"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Title */}
						<div className="space-y-1.5">
							<Label>Title *</Label>
							<Input
								placeholder="e.g. John's chest, Aisha's dress"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="h-11"
							/>
						</div>

						{/* Measurement fields – dynamic fields with default values (like Styles) */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Measurement fields</Label>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={addField}
								>
									<Plus className="h-3.5 w-3.5 mr-1" /> Add field
								</Button>
							</div>
							<div className="space-y-3">
								{fields.map((f, idx) => (
									<div key={f.key} className="grid grid-cols-2 gap-2 items-end">
										<Input
											placeholder="Label (e.g. Chest)"
											value={f.label}
											onChange={(e) => updateField(idx, e.target.value)}
											className="h-10"
										/>
										<div className="flex gap-1">
											<Input
												type="number"
												step="any"
												placeholder="Value"
												value={values[f.key] || ""}
												onChange={(e) =>
													setValues({ ...values, [f.key]: e.target.value })
												}
												className="h-10"
											/>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												onClick={() => removeField(idx)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>
								))}
								{fields.length === 0 && (
									<p className="text-xs text-muted-foreground">
										No fields yet. Click "Add field" to start.
									</p>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={save}
							disabled={saving}
							className="w-full sm:w-auto"
						>
							{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Save measurement
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* New Customer Modal (nested) */}
			<Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>New customer</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Input
							placeholder="Name *"
							value={newCustomerName}
							onChange={(e) => setNewCustomerName(e.target.value)}
						/>
						<Input
							placeholder="Phone"
							value={newCustomerPhone}
							onChange={(e) => setNewCustomerPhone(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button onClick={createNewCustomer}>Create customer</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* View Measurement Modal */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{viewing?.title}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="text-sm">
							<span className="font-medium">Customer:</span>{" "}
							{viewing?.customers?.name ?? "—"}
						</div>
						<div className="text-sm">
							<span className="font-medium">Created:</span>{" "}
							{viewing?.created_at
								? new Date(viewing.created_at).toLocaleString()
								: "—"}
						</div>
						<div className="border-t pt-2">
							<Label>Measurements</Label>
							<div className="mt-2 space-y-1">
								{viewing?.fields.map((field) => (
									<div key={field.key} className="flex justify-between text-sm">
										<span>{field.label}:</span>
										<span className="font-medium">
											{viewing.values[field.key] || "—"} {field.unit}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button onClick={() => setViewOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default QuickMeasure;
