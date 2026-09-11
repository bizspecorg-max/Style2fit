import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/** Where the reset email lands: the link signs the user in, then they choose a new password. */
const ResetPassword = () => {
	const { t } = useTranslation();
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		document.title = `${t("resetPage.title")} · Style2Fit`;
	}, [t]);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < MIN_PASSWORD_LENGTH) return setError(t("signup.errors.passwordWeak", { min: MIN_PASSWORD_LENGTH }));
		if (password !== confirm) return setError(t("profile.errors.mismatch"));
		setError(undefined);
		setSaving(true);
		const { error: updateError } = await supabase.auth.updateUser({ password });
		setSaving(false);
		if (updateError) return setError(updateError.message);
		toast.success(t("resetPage.done"));
		navigate("/", { replace: true });
	};

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
			<div className="w-full max-w-md space-y-8">
				<Link to="/" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
					<Logo />
				</Link>
				<div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
					<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent" aria-hidden>
						<KeyRound className="h-5 w-5" />
					</span>
					<h1 className="mt-5 font-display text-3xl leading-tight">{t("resetPage.title")}</h1>
					{loading ? (
						<div className="flex justify-center py-10" role="status" aria-label={t("common.loading")}>
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
						</div>
					) : !user ? (
						<div className="mt-2 space-y-6">
							<p className="text-sm leading-relaxed text-muted-foreground">{t("resetPage.expired")}</p>
							<Button className="h-12 w-full rounded-full" asChild>
								<Link to="/auth">{t("resetPage.backToSignIn")}</Link>
							</Button>
						</div>
					) : (
						<form onSubmit={save} noValidate className="mt-2 space-y-5">
							<p className="text-sm text-muted-foreground">{t("resetPage.for", { email: user.email })}</p>
							<div className="space-y-1.5">
								<Label htmlFor="new-password">{t("profile.newPassword")}</Label>
								<PasswordField id="new-password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="reset-strength" />
								<PasswordStrength id="reset-strength" password={password} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="confirm-password">{t("profile.confirmPassword")}</Label>
								<PasswordField id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
							</div>
							{error && (
								<p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
									{error}
								</p>
							)}
							<Button type="submit" className="h-12 w-full rounded-full text-base shadow-soft" disabled={saving}>
								{saving && <Loader2 className="h-4 w-4 animate-spin" />}
								{t("resetPage.save")}
							</Button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default ResetPassword;
