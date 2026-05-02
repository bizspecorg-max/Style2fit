import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Plus,
	Pencil,
	Trash2,
	Image as ImgIcon,
	X,
	Ruler,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
	CATEGORIES,
	Category,
	TEMPLATES,
	MeasurementField,
	newField,
} from "@/lib/measurementTemplates";
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary";

type Style = {
	id: string;
	name: string;
	category: string;
	image_url: string | null;
	measurement_template: MeasurementField[];
};

const schema = z.object({
	name: z.string().trim().min(1).max(100),
	category: z.string().min(1),
});

const Styles = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [items, setItems] = useState<Style[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Style | null>(null);

	const [name, setName] = useState("");
	const [category, setCategory] = useState<Category>("Shirt");
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [fields, setFields] = useState<MeasurementField[]>(TEMPLATES["Shirt"]);

	useEffect(() => {
		document.title = "Styles · Style2Fit";
	}, []);

	const load = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("styles")
			.select("*")
			.order("created_at", { ascending: false });
		setItems((data as unknown as Style[]) ?? []);
		setLoading(false);
	};
	useEffect(() => {
		if (user) load();
	}, [user]);

	const openNew = () => {
		setEditing(null);
		setName("");
		setCategory("Shirt");
		setImageUrl(null);
		setFields(TEMPLATES["Shirt"]);
		setOpen(true);
	};
	const openEdit = (s: Style) => {
		setEditing(s);
		setName(s.name);
		setCategory(s.category as Category);
		setImageUrl(s.image_url);
		setFields(
			s.measurement_template?.length
				? s.measurement_template
				: (TEMPLATES[s.category as Category] ?? [])
		);
		setOpen(true);
	};

	const onCategoryChange = (val: string) => {
		setCategory(val as Category);
		if (!editing) setFields(TEMPLATES[val as Category] ?? []);
	};

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!cloudinaryConfigured) {
			toast.error(
				"Cloudinary not configured yet. Add your cloud name + preset."
			);
			return;
		}
		setUploading(true);
		try {
			setImageUrl(await uploadToCloudinary(file));
			toast.success("Image uploaded");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setUploading(false);
		}
	};

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		const parsed = schema.safeParse({ name, category });
		if (!parsed.success) return toast.error(parsed.error.issues[0].message);
		const cleanFields = fields.filter((f) => f.label.trim().length > 0);
		const payload = {
			name,
			category,
			image_url: imageUrl,
			measurement_template: cleanFields,
		};
		if (editing) {
			const { error } = await supabase
				.from("styles")
				.update(payload)
				.eq("id", editing.id);
			if (error) return toast.error(error.message);
			toast.success("Style updated");
		} else {
			const { error } = await supabase
				.from("styles")
				.insert({ ...payload, user_id: user!.id });
			if (error) return toast.error(error.message);
			toast.success("Style created");
		}
		setOpen(false);
		load();
	};

	const remove = async (id: string) => {
		if (!confirm("Delete this style?")) return;
		const { error } = await supabase.from("styles").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		load();
	};

	return (
		<div className="space-y-5 p-4 md:p-6">
			<header className="flex items-center justify-between gap-3">
				<div>
					<h1 className="font-display text-3xl font-bold">Styles</h1>
					<p className="text-sm text-muted-foreground">{items.length} total</p>
				</div>
				<Button onClick={openNew} className="h-11">
					<Plus className="h-4 w-4 mr-1.5" /> New style
				</Button>
			</header>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : items.length === 0 ? (
				<Card className="p-10 text-center">
					<p className="text-sm text-muted-foreground">
						No styles yet. Create your first one.
					</p>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{items.map((s) => (
						<Card
							key={s.id}
							className="overflow-hidden border-border/70 group flex flex-col"
						>
							{/* Image section with fixed height */}
							<div className="relative aspect-square bg-muted">
								{s.image_url ? (
									<img
										src={s.image_url}
										alt={s.name}
										loading="lazy"
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="h-full w-full flex items-center justify-center text-muted-foreground">
										<ImgIcon className="h-10 w-10" />
									</div>
								)}
								<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
									<Button
										size="icon"
										variant="secondary"
										className="h-8 w-8"
										onClick={() => openEdit(s)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										size="icon"
										variant="secondary"
										className="h-8 w-8"
										onClick={() => remove(s.id)}
									>
										<Trash2 className="h-3.5 w-3.5 text-destructive" />
									</Button>
								</div>
							</div>

							{/* Content area with flexible layout */}
							<div className="p-4 flex flex-col flex-1">
								<div className="flex-1">
									<div className="font-semibold truncate text-base">
										{s.name}
									</div>
									<div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
										{s.category}
									</div>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="w-full mt-4 h-9"
									onClick={() => navigate(`/orders?style=${s.id}&new=1`)}
								>
									<Ruler className="h-3.5 w-3.5 mr-1.5" /> Take measurement
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editing ? "Edit style" : "New style"}</DialogTitle>
					</DialogHeader>
					<form onSubmit={save} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="name">Style name *</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="h-11"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Category *</Label>
							<Select value={category} onValueChange={onCategoryChange}>
								<SelectTrigger className="h-11">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORIES.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label>Image</Label>
							<div className="flex items-center gap-3">
								<label className="flex-1 flex items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition relative overflow-hidden">
									{imageUrl ? (
										<img
											src={imageUrl}
											alt=""
											className="absolute inset-0 h-full w-full object-cover"
										/>
									) : uploading ? (
										<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
									) : (
										<span className="text-xs text-muted-foreground flex items-center gap-1.5">
											<ImgIcon className="h-4 w-4" /> Upload image
										</span>
									)}
									<input
										type="file"
										accept="image/*"
										className="hidden"
										onChange={onFile}
									/>
								</label>
								{imageUrl && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setImageUrl(null)}
									>
										<X className="h-4 w-4" />
									</Button>
								)}
							</div>
							{!cloudinaryConfigured && (
								<p className="text-[11px] text-warning">
									Add Cloudinary cloud name + preset to enable uploads.
								</p>
							)}
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Measurement fields</Label>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => setFields([...fields, newField("")])}
								>
									<Plus className="h-3.5 w-3.5 mr-1" /> Add field
								</Button>
							</div>
							<div className="space-y-2">
								{fields.map((f, i) => (
									<div key={f.key} className="flex gap-2">
										<Input
											value={f.label}
											onChange={(e) => {
												const next = [...fields];
												next[i] = { ...f, label: e.target.value };
												setFields(next);
											}}
											placeholder="e.g. Chest"
											className="h-10"
										/>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											onClick={() =>
												setFields(fields.filter((_, idx) => idx !== i))
											}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>

						<DialogFooter>
							<Button type="submit" className="w-full sm:w-auto">
								{editing ? "Save changes" : "Create style"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Styles;
