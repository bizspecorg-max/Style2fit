import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-dialog";
import { cloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary";
import { CATEGORIES, TEMPLATES, newField, type Category, type MeasurementField } from "@/lib/measurementTemplates";
import type { StyleRow } from "@/lib/styles";

/** Create or edit a style: name, category, photo and the measurements it needs. */
export function StyleDialog({
	open,
	onOpenChange,
	style,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	style: StyleRow | null;
	onSaved: () => void;
}) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [name, setName] = useState("");
	const [category, setCategory] = useState<Category>("Shirt");
	const [imageUrl, setImageUrl] = useState("");
	const [fields, setFields] = useState<MeasurementField[]>([]);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		const cat = (style?.category as Category) ?? "Shirt";
		setName(style?.name ?? "");
		setCategory(CATEGORIES.includes(cat) ? cat : "Other");
		setImageUrl(style?.image_url ?? "");
		setFields(style?.measurement_template?.length ? style.measurement_template : TEMPLATES[cat] ?? TEMPLATES.Shirt);
		setError(undefined);
	}, [open, style]);

	const changeCategory = (next: Category) => {
		setCategory(next);
		// New styles follow the category's template; edits keep their own fields.
		if (!style) setFields(TEMPLATES[next]);
	};

	const move = (i: number, by: -1 | 1) => {
		const j = i + by;
		if (j < 0 || j >= fields.length) return;
		const next = [...fields];
		[next[i], next[j]] = [next[j], next[i]];
		setFields(next);
	};

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			setImageUrl(await uploadToCloudinary(file));
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setUploading(false);
		}
	};

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return setError(t("styles.errors.nameRequired"));
		if (imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim())) return setError(t("styles.errors.imageUrl"));
		const clean = fields.filter((f) => f.label.trim()).map((f) => ({ ...f, label: f.label.trim() }));
		if (!user) return;
		setSaving(true);
		const payload = { name: name.trim(), category, image_url: imageUrl.trim() || null, measurement_template: clean };
		const { error: saveError } = style
			? await supabase.from("styles").update(payload).eq("id", style.id)
			: await supabase.from("styles").insert({ ...payload, user_id: user.id });
		setSaving(false);
		if (saveError) return setError(saveError.message);
		toast.success(style ? t("styles.updated") : t("styles.created"));
		onOpenChange(false);
		onSaved();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{style ? t("styles.editTitle") : t("styles.newTitle")}</DialogTitle>
					<DialogDescription>{t("styles.formHint")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={save} noValidate className="space-y-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="style-name">{t("styles.name")}</Label>
							<Input id="style-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("styles.namePlaceholder")} className="h-11" />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="style-category">{t("styles.category")}</Label>
							<select
								id="style-category"
								value={category}
								onChange={(e) => changeCategory(e.target.value as Category)}
								className="h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
							>
								{CATEGORIES.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={cloudinaryConfigured ? "style-image-file" : "style-image-url"}>{t("styles.photo")}</Label>
						<div className="flex items-center gap-3">
							<div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
								{uploading ? (
									<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
								) : imageUrl ? (
									<img src={imageUrl} alt="" className="h-full w-full object-cover" />
								) : (
									<ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
								)}
							</div>
							{cloudinaryConfigured ? (
								<Input id="style-image-file" type="file" accept="image/*" onChange={onFile} className="h-11 flex-1 pt-2" />
							) : (
								<Input
									id="style-image-url"
									type="url"
									inputMode="url"
									placeholder="https://…"
									value={imageUrl}
									onChange={(e) => setImageUrl(e.target.value)}
									className="h-11 flex-1"
								/>
							)}
							{imageUrl && (
								<Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={t("styles.removePhoto")} onClick={() => setImageUrl("")}>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
						{!cloudinaryConfigured && <p className="text-xs text-muted-foreground">{t("styles.photoLinkHint")}</p>}
					</div>

					<fieldset className="space-y-2">
						<legend className="mb-1 text-sm font-medium">{t("styles.fields")}</legend>
						{fields.map((f, i) => (
							<div key={f.key} className="flex items-center gap-1.5">
								<Input
									aria-label={t("measure.fieldName", { n: i + 1 })}
									value={f.label}
									onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
									placeholder={t("measure.fieldPlaceholder")}
									className="h-11 flex-1"
								/>
								<Button type="button" variant="ghost" size="icon" className="h-11 w-9" aria-label={t("styles.moveUp", { label: f.label })} disabled={i === 0} onClick={() => move(i, -1)}>
									<ArrowUp className="h-4 w-4" />
								</Button>
								<Button type="button" variant="ghost" size="icon" className="h-11 w-9" aria-label={t("styles.moveDown", { label: f.label })} disabled={i === fields.length - 1} onClick={() => move(i, 1)}>
									<ArrowDown className="h-4 w-4" />
								</Button>
								<Button type="button" variant="ghost" size="icon" className="h-11 w-9" aria-label={t("measure.removeField", { label: f.label || i + 1 })} onClick={() => setFields(fields.filter((_, j) => j !== i))}>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setFields([...fields, newField("")])}>
								<Plus className="h-4 w-4" />
								{t("measure.addField")}
							</Button>
							{style && (
								<Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => setFields(TEMPLATES[category])}>
									{t("styles.useTemplate", { category })}
								</Button>
							)}
						</div>
					</fieldset>

					{error && (
						<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" className="h-11" disabled={saving || uploading}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{style ? t("common.save") : t("styles.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
