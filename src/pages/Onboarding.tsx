import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ShopFields, clearChangedShopErrors, type ShopErrors, type ShopState } from "@/components/ShopFields";
import { Button } from "@/components/ui/button";
import { findCountry, fromE164, guessCountry, toE164 } from "@/lib/countries";

/**
 * One-time step for accounts created before shops had a country: saves country,
 * currency and unit on the user's auth profile (no database changes needed).
 */
const Onboarding = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const navigate = useNavigate();
	const [shop, setShop] = useState<ShopState | null>(null);
	const [errors, setErrors] = useState<ShopErrors>({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = `${t("onboarding.title")} · Style2Fit`;
		if (!user) return;
		(async () => {
			const { data } = await supabase.from("profiles").select("business_name, phone").eq("id", user.id).maybeSingle();
			const meta = user.user_metadata ?? {};
			const guess = (meta.country as string | undefined) ?? guessCountry();
			const phone = fromE164((data?.phone as string | null) ?? (meta.phone as string | undefined), guess);
			setShop({
				businessName: (data?.business_name as string | null) ?? (meta.business_name as string | undefined) ?? "",
				country: phone.country,
				national: phone.national,
				unit: (meta.unit as "cm" | "in" | undefined) ?? findCountry(phone.country).unit,
			});
		})();
	}, [user, t]);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !shop) return;
		const phone = toE164(shop.country, shop.national);
		const found: ShopErrors = {};
		if (!shop.businessName.trim()) found.businessName = t("signup.errors.businessRequired");
		if (!phone) found.phone = t("signup.errors.phoneInvalid");
		setErrors(found);
		if (Object.keys(found).length || !phone) return;

		setSaving(true);
		const { error: profileError } = await supabase
			.from("profiles")
			.update({ business_name: shop.businessName.trim(), phone })
			.eq("id", user.id);
		const { error: metaError } = await supabase.auth.updateUser({
			data: { country: shop.country, currency: findCountry(shop.country).currency, unit: shop.unit },
		});
		setSaving(false);
		const error = profileError ?? metaError;
		if (error) return toast.error(error.message);
		toast.success(t("onboarding.saved"));
		navigate("/", { replace: true });
	};

	return (
		<div className="min-h-dvh bg-muted/40 px-5 py-8 sm:py-12">
			<div className="mx-auto w-full max-w-md space-y-6">
				<Logo />
				<div className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
					<h1 className="font-display text-2xl font-bold">{t("onboarding.title")}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
					{!shop ? (
						<div className="flex justify-center py-12" role="status" aria-label={t("common.loading")}>
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : (
						<form onSubmit={save} noValidate className="mt-6 space-y-6">
							<ShopFields
								value={shop}
								onChange={(next) => {
									setErrors((e) => clearChangedShopErrors(e, shop, next));
									setShop(next);
								}}
								errors={errors}
							/>
							<Button type="submit" className="h-12 w-full text-base" disabled={saving}>
								{saving && <Loader2 className="h-4 w-4 animate-spin" />}
								{saving ? t("onboarding.saving") : t("onboarding.save")}
							</Button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default Onboarding;
