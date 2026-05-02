import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

type Customer = {
	id: string;
	name: string;
	phone: string;
	email: string | null;
	notes: string | null;
};

const schema = z.object({
	name: z.string().trim().min(1, "Name required").max(100),
	phone: z.string().trim().min(7, "Phone required").max(20),
	email: z.string().trim().email().max(255).optional().or(z.literal("")),
	notes: z.string().max(1000).optional().or(z.literal("")),
});

const Customers = () => {
	const { user } = useAuth();
	const [items, setItems] = useState<Customer[]>([]);
	const [q, setQ] = useState("");
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Customer | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		document.title = "Customers · Style2Fit";
	}, []);

	const load = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("customers")
			.select("*")
			.order("created_at", { ascending: false });
		setItems((data as Customer[]) ?? []);
		setLoading(false);
	};

	useEffect(() => {
		if (user) load();
	}, [user]);

	const filtered = items.filter((c) => {
		const s = q.toLowerCase();
		return (
			!s ||
			c.name.toLowerCase().includes(s) ||
			c.phone.includes(s) ||
			(c.email ?? "").toLowerCase().includes(s)
		);
	});

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const parsed = schema.safeParse({
			name: fd.get("name"),
			phone: fd.get("phone"),
			email: fd.get("email") || "",
			notes: fd.get("notes") || "",
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		const payload = {
			name: parsed.data.name,
			phone: parsed.data.phone,
			email: parsed.data.email || null,
			notes: parsed.data.notes || null,
		};
		if (editing) {
			const { error } = await supabase
				.from("customers")
				.update(payload)
				.eq("id", editing.id);
			if (error) return toast.error(error.message);
			toast.success("Customer updated");
		} else {
			const { error } = await supabase
				.from("customers")
				.insert({ ...payload, user_id: user!.id });
			if (error) return toast.error(error.message);
			toast.success("Customer added");
		}
		setOpen(false);
		setEditing(null);
		load();
	};

	const remove = async (id: string) => {
		if (
			!confirm(
				"Delete this customer? Orders linked to them will block deletion."
			)
		)
			return;
		const { error } = await supabase.from("customers").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		load();
	};

	return (
		<div className="space-y-5 p-4 md:p-6">
			<header className="flex items-center justify-between gap-3">
				<div>
					<h1 className="font-display text-3xl font-bold">Customers</h1>
					<p className="text-sm text-muted-foreground">{items.length} total</p>
				</div>
				<Dialog
					open={open}
					onOpenChange={(o) => {
						setOpen(o);
						if (!o) setEditing(null);
					}}
				>
					<DialogTrigger asChild>
						<Button className="h-11">
							<Plus className="h-4 w-4 mr-1.5" /> Add
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>
								{editing ? "Edit customer" : "New customer"}
							</DialogTitle>
						</DialogHeader>
						<form onSubmit={onSubmit} className="space-y-4">
							<Fld
								id="name"
								label="Name *"
								defaultValue={editing?.name}
								required
							/>
							<Fld
								id="phone"
								label="Phone *"
								type="tel"
								defaultValue={editing?.phone}
								required
							/>
							<Fld
								id="email"
								label="Email"
								type="email"
								defaultValue={editing?.email ?? ""}
							/>
							<div className="space-y-1.5">
								<Label htmlFor="notes">Notes</Label>
								<Textarea
									id="notes"
									name="notes"
									defaultValue={editing?.notes ?? ""}
									rows={3}
								/>
							</div>
							<DialogFooter>
								<Button type="submit" className="w-full sm:w-auto">
									{editing ? "Save" : "Add customer"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</header>

			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search by name, phone, email"
					className="pl-9 h-12"
				/>
			</div>

			{/* Table layout – clean & responsive */}
			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : filtered.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-sm text-muted-foreground">No customers yet.</p>
				</Card>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 border-b">
							<tr>
								<th className="text-left p-3 font-medium">Name</th>
								<th className="text-left p-3 font-medium">Phone</th>
								<th className="text-left p-3 font-medium">Email</th>
								<th className="text-left p-3 font-medium">Notes</th>
								<th className="text-left p-3 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.map((c) => (
								<tr key={c.id} className="hover:bg-muted/30 transition-colors">
									<td className="p-3 font-medium">{c.name}</td>
									<td className="p-3">{c.phone}</td>
									<td className="p-3">{c.email || "—"}</td>
									<td className="p-3 max-w-xs truncate">{c.notes || "—"}</td>
									<td className="p-3">
										<div className="flex gap-1">
											<Button
												size="icon"
												variant="ghost"
												onClick={() => {
													setEditing(c);
													setOpen(true);
												}}
												aria-label="Edit"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => remove(c.id)}
												aria-label="Delete"
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
		</div>
	);
};

const Fld = ({
	id,
	label,
	...rest
}: {
	id: string;
	label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
	<div className="space-y-1.5">
		<Label htmlFor={id}>{label}</Label>
		<Input id={id} name={id} className="h-11" {...rest} />
	</div>
);

export default Customers;
