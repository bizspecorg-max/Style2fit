import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneInput } from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fromE164, toE164 } from "@/lib/countries";
import { useShop } from "@/lib/shop";

export type Customer = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	notes: string | null;
	created_at: string;
};

type Errors = Partial<Record<"name" | "phone" | "email" | "form", string>>;

/** Add or edit a customer. Phone numbers are saved in international format (+234…). */
export function CustomerFormDialog({
	open,
	onOpenChange,
	customer,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customer?: Customer | null;
	onSaved: (id: string) => void;
}) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const [name, setName] = useState("");
	const [country, setCountry] = useState(shop.country);
	const [national, setNational] = useState("");
	const [email, setEmail] = useState("");
	const [notes, setNotes] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		const phone = fromE164(customer?.phone, shop.country);
		setName(customer?.name ?? "");
		setCountry(phone.country);
		setNational(phone.national);
		setEmail(customer?.email ?? "");
		setNotes(customer?.notes ?? "");
		setErrors({});
	}, [open, customer, shop.country]);

	const clear = (field: keyof Errors) => setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		const phone = toE164(country, national);
		const found: Errors = {};
		if (!name.trim()) found.name = t("customers.errors.nameRequired");
		if (!phone) found.phone = t("signup.errors.phoneInvalid");
		if (email.trim() && !z.string().email().safeParse(email.trim()).success) found.email = t("auth.errors.invalidEmail");
		setErrors(found);
		if (Object.keys(found).length || !phone || !user) return;

		setSaving(true);
		const payload = { name: name.trim(), phone, email: email.trim() || null, notes: notes.trim() || null };
		const result = customer
			? await supabase.from("customers").update(payload).eq("id", customer.id).select("id").single()
			: await supabase.from("customers").insert({ ...payload, user_id: user.id }).select("id").single();
		setSaving(false);
		if (result.error) return setErrors({ form: result.error.message });
		toast.success(customer ? t("customers.updated") : t("customers.added"));
		onOpenChange(false);
		onSaved(result.data.id as string);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{customer ? t("customers.editTitle") : t("customers.newTitle")}</DialogTitle>
					<DialogDescription>{t("customers.formHint")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={save} noValidate className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="customer-name">{t("customers.name")}</Label>
						<Input
							id="customer-name"
							autoComplete="off"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								clear("name");
							}}
							aria-invalid={!!errors.name || undefined}
							aria-describedby={errors.name ? "customer-name-error" : undefined}
							className="h-12"
						/>
						{errors.name && (
							<p id="customer-name-error" className="text-sm text-destructive">
								{errors.name}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="customer-phone">{t("customers.phone")}</Label>
						<PhoneInput
							id="customer-phone"
							country={country}
							national={national}
							onCountryChange={(c) => {
								setCountry(c);
								clear("phone");
							}}
							onNationalChange={(v) => {
								setNational(v);
								clear("phone");
							}}
							invalid={!!errors.phone}
							describedBy={errors.phone ? "customer-phone-error" : undefined}
						/>
						{errors.phone && (
							<p id="customer-phone-error" className="text-sm text-destructive">
								{errors.phone}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="customer-email">{t("customers.emailOptional")}</Label>
						<Input
							id="customer-email"
							type="email"
							inputMode="email"
							autoComplete="off"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								clear("email");
							}}
							aria-invalid={!!errors.email || undefined}
							className="h-12"
						/>
						{errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="customer-notes">{t("customers.notesOptional")}</Label>
						<Textarea
							id="customer-notes"
							rows={3}
							maxLength={1000}
							placeholder={t("customers.notesPlaceholder")}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</div>
					{errors.form && (
						<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{errors.form}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" className="h-11" disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{customer ? t("common.save") : t("customers.add")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
