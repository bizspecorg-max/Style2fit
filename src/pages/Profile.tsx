import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, KeyRound, Loader2, LogOut, MessageCircle, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { PasswordStrength } from "@/components/PasswordStrength";
import { ShopFields, clearChangedShopErrors, type ShopErrors, type ShopState } from "@/components/ShopFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findCountry, fromE164, toE164 } from "@/lib/countries";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { formatDate, useShop, whatsappLink } from "@/lib/shop";

const SUPPORT_PHONE = "+2347035599433";

function Section({ icon: Icon, title, description, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; children: React.ReactNode }) {
	return (
		<section className="rounded-2xl border bg-card p-5 sm:p-6">
			<div className="mb-5 flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
					<Icon className="h-4 w-4" />
				</span>
				<div>
					<h2 className="font-display text-lg font-bold">{title}</h2>
					{description && <p className="text-sm text-muted-foreground">{description}</p>}
				</div>
			</div>
			{children}
		</section>
	);
}

function ShopSection() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const queryClient = useQueryClient();
	const [fullName, setFullName] = useState("");
	const [state, setState] = useState<ShopState | null>(null);
	const [errors, setErrors] = useState<ShopErrors>({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!user) return;
		(async () => {
			const { data } = await supabase.from("profiles").select("business_name, full_name, phone").eq("id", user.id).maybeSingle();
			const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
			const phone = fromE164((data?.phone as string | null) ?? meta.phone, shop.country);
			setFullName((data?.full_name as string | null) ?? meta.full_name ?? "");
			setState({
				businessName: (data?.business_name as string | null) ?? meta.business_name ?? "",
				country: meta.country ?? phone.country,
				national: phone.national,
				unit: shop.unit,
			});
		})();
		// Load once per user; later edits are local until saved.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id]);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !state) return;
		const phone = toE164(state.country, state.national);
		const found: ShopErrors = {};
		if (!state.businessName.trim()) found.businessName = t("signup.errors.businessRequired");
		if (!phone) found.phone = t("signup.errors.phoneInvalid");
		setErrors(found);
		if (Object.keys(found).length || !phone) return;

		setSaving(true);
		const details = { business_name: state.businessName.trim(), full_name: fullName.trim() || null, phone };
		const { error: profileError } = await supabase.from("profiles").update(details).eq("id", user.id);
		const { error: metaError } = await supabase.auth.updateUser({
			data: { ...details, country: state.country, currency: findCountry(state.country).currency, unit: state.unit },
		});
		setSaving(false);
		const error = profileError ?? metaError;
		if (error) return toast.error(error.message);
		// Money, units and the greeting read these settings — refresh cached screens.
		queryClient.invalidateQueries();
		toast.success(t("profile.saved"));
	};

	if (!state) return <Skeleton className="h-80 w-full rounded-xl" />;

	return (
		<form onSubmit={save} noValidate className="space-y-5">
			<div className="space-y-1.5">
				<Label htmlFor="profile-name">{t("signup.fullName")}</Label>
				<Input id="profile-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12" />
			</div>
			<ShopFields
				value={state}
				onChange={(next) => {
					setErrors((prev) => clearChangedShopErrors(prev, state, next));
					setState(next);
				}}
				errors={errors}
			/>
			<Button type="submit" className="h-11" disabled={saving}>
				{saving && <Loader2 className="h-4 w-4 animate-spin" />}
				{t("profile.saveShop")}
			</Button>
		</form>
	);
}

function PasswordSection() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user?.email) return;
		if (!current) return setError(t("profile.errors.currentRequired"));
		if (next.length < MIN_PASSWORD_LENGTH) return setError(t("signup.errors.passwordWeak", { min: MIN_PASSWORD_LENGTH }));
		if (next !== confirm) return setError(t("profile.errors.mismatch"));
		setError(undefined);
		setSaving(true);
		const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
		if (signInError) {
			setSaving(false);
			return setError(t("profile.errors.currentWrong"));
		}
		const { error: updateError } = await supabase.auth.updateUser({ password: next });
		setSaving(false);
		if (updateError) return setError(updateError.message);
		setCurrent("");
		setNext("");
		setConfirm("");
		toast.success(t("profile.passwordChanged"));
	};

	return (
		<form onSubmit={save} noValidate className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="current-password">{t("profile.currentPassword")}</Label>
				<Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-12" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="new-password">{t("profile.newPassword")}</Label>
					<Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="new-password-strength" className="h-12" />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="confirm-password">{t("profile.confirmPassword")}</Label>
					<Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12" />
				</div>
			</div>
			<PasswordStrength id="new-password-strength" password={next} />
			{error && (
				<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</p>
			)}
			<Button type="submit" variant="outline" className="h-11" disabled={saving}>
				{saving && <Loader2 className="h-4 w-4 animate-spin" />}
				{t("profile.updatePassword")}
			</Button>
		</form>
	);
}

function SubscriptionSection() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const shop = useShop();
	const [searchParams] = useSearchParams();
	const { data: subscription, isLoading } = useSubscription();
	const [paying, setPaying] = useState(false);

	if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const trialEnd = subscription?.trial_end ? new Date(`${subscription.trial_end}T00:00:00`) : null;
	const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - today.getTime()) / 86_400_000)) : 0;
	const active = subscription?.status === "active";
	const onTrial = subscription?.status === "trial" && daysLeft > 0;
	const nigeria = shop.country === "NG";
	const payMessage = t("profile.paidMessage", { email: user?.email ?? "" });

	return (
		<div className="space-y-4">
			{searchParams.get("expired") === "true" && !active && !onTrial && (
				<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{t("profile.expiredBanner")}
				</p>
			)}
			<div className="flex flex-wrap items-center gap-3">
				<Badge className={active ? "bg-success text-white" : onTrial ? "bg-accent text-accent-foreground" : "bg-destructive text-white"}>
					{active ? t("profile.planActive") : onTrial ? t("profile.planTrial") : t("profile.planExpired")}
				</Badge>
				<p className="text-sm text-muted-foreground">
					{active
						? t("profile.validUntil", { date: subscription?.paid_until ? formatDate(subscription.paid_until, shop.locale) : t("profile.recurring") })
						: onTrial
							? t("profile.daysLeft", { count: daysLeft })
							: t("profile.subscribeToContinue")}
				</p>
			</div>
			<Button className="h-11" variant={active ? "outline" : "default"} onClick={() => setPaying(true)}>
				<CreditCard className="h-4 w-4" />
				{active ? t("profile.renew") : t("profile.upgrade")}
			</Button>

			<Dialog open={paying} onOpenChange={setPaying}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("profile.payTitle")}</DialogTitle>
						<DialogDescription>{nigeria ? t("profile.payBodyNg") : t("profile.payBodyIntl")}</DialogDescription>
					</DialogHeader>
					{nigeria && (
						<div className="rounded-xl bg-muted p-4">
							<p className="text-sm text-muted-foreground">{t("profile.opay")}</p>
							<p className="mt-1 font-mono text-xl tracking-wider">703 559 9433</p>
							<p className="mt-1 text-sm">{t("profile.accountName")}: <strong>Style2Fit</strong></p>
							<p className="text-sm">{t("profile.amount")}: <strong>₦5,000 / {t("profile.month")}</strong></p>
						</div>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setPaying(false)}>
							{t("common.cancel")}
						</Button>
						<Button className="bg-[#1f7a4d] text-white hover:bg-[#1a6841]" asChild>
							<a href={whatsappLink(SUPPORT_PHONE, nigeria ? payMessage : t("profile.intlMessage", { email: user?.email ?? "" }))} target="_blank" rel="noreferrer" onClick={() => setPaying(false)}>
								<MessageCircle className="h-4 w-4" />
								{nigeria ? t("profile.iPaid") : t("profile.contactSales")}
							</a>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

const Profile = () => {
	const { t } = useTranslation();
	const { user, signOut } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		document.title = `${t("nav.profile")} · Style2Fit`;
	}, [t]);

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header>
				<h1 className="font-display text-3xl font-bold">{t("nav.profile")}</h1>
				<p className="text-sm text-muted-foreground">{user?.email}</p>
			</header>

			<Section icon={Store} title={t("profile.shopTitle")} description={t("profile.shopBody")}>
				<ShopSection />
			</Section>
			<Section icon={CreditCard} title={t("profile.subscriptionTitle")}>
				<SubscriptionSection />
			</Section>
			<Section icon={KeyRound} title={t("profile.passwordTitle")}>
				<PasswordSection />
			</Section>
			<Section icon={UserRound} title={t("profile.helpTitle")} description={t("profile.helpBody")}>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button variant="outline" className="h-11" asChild>
						<a href={whatsappLink(SUPPORT_PHONE, t("profile.supportMessage", { email: user?.email ?? "" }))} target="_blank" rel="noreferrer">
							<MessageCircle className="h-4 w-4" />
							{t("profile.whatsappSupport")}
						</a>
					</Button>
					<Button
						variant="ghost"
						className="h-11 text-destructive hover:text-destructive"
						onClick={async () => {
							await signOut();
							navigate("/auth", { replace: true });
						}}
					>
						<LogOut className="h-4 w-4" />
						{t("nav.signOut")}
					</Button>
				</div>
			</Section>
		</div>
	);
};

export default Profile;
