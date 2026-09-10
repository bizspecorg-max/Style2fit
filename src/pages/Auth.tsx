import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { PasswordStrength } from "@/components/PasswordStrength";
import { ShopFields, clearChangedShopErrors, type ShopErrors, type ShopState } from "@/components/ShopFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { findCountry, guessCountry, toE164 } from "@/lib/countries";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { cn } from "@/lib/utils";

const emailSchema = z.string().trim().email().max(255);

type Errors<K extends string> = Partial<Record<K | "form", string>>;

/** Removes a field's error (and the form-level error) once the user edits it. */
function withoutError<K extends string>(errors: Errors<K>, field: K): Errors<K> {
	if (!errors[field] && !errors.form) return errors;
	return { ...errors, [field]: undefined, form: undefined };
}

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} className="text-sm text-destructive">
			{message}
		</p>
	);
}

function FormError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{message}
		</p>
	);
}

function PasswordField({
	id,
	value,
	onChange,
	autoComplete,
	describedBy,
	invalid,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete: string;
	describedBy?: string;
	invalid?: boolean;
}) {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);
	return (
		<div className="relative">
			<Input
				id={id}
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-describedby={describedBy}
				aria-invalid={invalid || undefined}
				className="h-12 pr-12"
			/>
			<button
				type="button"
				onClick={() => setVisible((v) => !v)}
				aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
				aria-pressed={visible}
				className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function SignInForm({ onForgot }: { onForgot: () => void }) {
	const { t } = useTranslation();
	const { signIn } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Errors<"email" | "password">>({});
	const [submitting, setSubmitting] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		const found: Errors<"email" | "password"> = {};
		if (!emailSchema.safeParse(email).success) found.email = t("auth.errors.invalidEmail");
		if (!password) found.password = t("auth.errors.passwordRequired");
		setErrors(found);
		if (Object.keys(found).length) return;

		setSubmitting(true);
		const { error } = await signIn(email.trim(), password);
		setSubmitting(false);
		if (error) {
			const code = (error as AuthError).code;
			setErrors({
				form:
					code === "email_not_confirmed"
						? t("auth.errors.emailNotConfirmed")
						: code === "invalid_credentials"
							? t("auth.errors.wrongCredentials")
							: error.message || t("auth.errors.generic"),
			});
			return;
		}
		toast.success(t("auth.welcome"));
		const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
		navigate(from && from !== "/auth" ? from : "/", { replace: true });
	};

	return (
		<form onSubmit={submit} noValidate className="space-y-5">
			<div className="space-y-1.5">
				<Label htmlFor="signin-email">{t("auth.email")}</Label>
				<Input
					id="signin-email"
					type="email"
					inputMode="email"
					autoComplete="email"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						setErrors((prev) => withoutError(prev, "email"));
					}}
					aria-invalid={!!errors.email || undefined}
					aria-describedby={errors.email ? "signin-email-error" : undefined}
					className="h-12"
				/>
				<FieldError id="signin-email-error" message={errors.email} />
			</div>
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<Label htmlFor="signin-password">{t("auth.password")}</Label>
					<button
						type="button"
						onClick={onForgot}
						className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{t("auth.forgotPassword")}
					</button>
				</div>
				<PasswordField
					id="signin-password"
					value={password}
					onChange={(value) => {
						setPassword(value);
						setErrors((prev) => withoutError(prev, "password"));
					}}
					autoComplete="current-password"
					invalid={!!errors.password}
					describedBy={errors.password ? "signin-password-error" : undefined}
				/>
				<FieldError id="signin-password-error" message={errors.password} />
			</div>
			<FormError message={errors.form} />
			<Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
				{submitting && <Loader2 className="h-4 w-4 animate-spin" />}
				{submitting ? t("auth.signingIn") : t("auth.signIn")}
			</Button>
		</form>
	);
}

// ---------------------------------------------------------------------------
// Sign up: 1) account  2) shop
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: 1 | 2 }) {
	const { t } = useTranslation();
	const labels = [t("signup.stepAccount"), t("signup.stepShop")];
	return (
		<ol className="flex items-center gap-3 text-xs font-medium" aria-label={t("signup.stepOf", { current: step, total: 2 })}>
			{labels.map((label, i) => {
				const n = i + 1;
				const done = step > n;
				return (
					<li key={label} className="flex flex-1 items-center gap-2" aria-current={step === n ? "step" : undefined}>
						<span
							className={cn(
								"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
								done && "border-primary bg-primary text-primary-foreground",
								step === n && "border-primary text-primary",
								step < n && "border-border text-muted-foreground"
							)}
						>
							{done ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
						</span>
						<span className={step === n ? "text-foreground" : "text-muted-foreground"}>{label}</span>
						{i === 0 && <span className="h-px flex-1 bg-border" aria-hidden />}
					</li>
				);
			})}
		</ol>
	);
}

function SignUpForm() {
	const { t } = useTranslation();
	const { signUp } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState<1 | 2>(1);
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [shop, setShop] = useState<ShopState>(() => {
		const country = guessCountry();
		return { businessName: "", country, national: "", unit: findCountry(country).unit };
	});
	const [errors, setErrors] = useState<Errors<"fullName" | "email" | "password">>({});
	const [shopErrors, setShopErrors] = useState<ShopErrors>({});
	const [submitting, setSubmitting] = useState(false);

	const next = (e: React.FormEvent) => {
		e.preventDefault();
		const found: Errors<"fullName" | "email" | "password"> = {};
		if (!fullName.trim()) found.fullName = t("signup.errors.nameRequired");
		if (!emailSchema.safeParse(email).success) found.email = t("auth.errors.invalidEmail");
		if (password.length < MIN_PASSWORD_LENGTH) found.password = t("signup.errors.passwordWeak", { min: MIN_PASSWORD_LENGTH });
		setErrors(found);
		if (!Object.keys(found).length) setStep(2);
	};

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		const phone = toE164(shop.country, shop.national);
		const found: ShopErrors = {};
		if (!shop.businessName.trim()) found.businessName = t("signup.errors.businessRequired");
		if (!phone) found.phone = t("signup.errors.phoneInvalid");
		setShopErrors(found);
		if (Object.keys(found).length || !phone) return;

		setSubmitting(true);
		const { error } = await signUp({
			email: email.trim(),
			password,
			full_name: fullName.trim(),
			business_name: shop.businessName.trim(),
			phone,
			country: shop.country,
			currency: findCountry(shop.country).currency,
			unit: shop.unit,
		});
		setSubmitting(false);
		if (error) {
			const code = (error as AuthError).code;
			if (code === "user_already_exists" || /already registered/i.test(error.message)) {
				setStep(1);
				setErrors({ email: t("signup.errors.emailTaken") });
			} else {
				setErrors({ form: error.message || t("auth.errors.generic") });
			}
			return;
		}
		toast.success(t("signup.done"));
		navigate("/", { replace: true });
	};

	return (
		<div className="space-y-6">
			<Stepper step={step} />

			{step === 1 ? (
				<form onSubmit={next} noValidate className="space-y-5">
					<div>
						<h2 className="font-display text-2xl font-bold">{t("signup.accountTitle")}</h2>
						<p className="mt-1 text-sm text-muted-foreground">{t("signup.accountSubtitle")}</p>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="signup-name">{t("signup.fullName")}</Label>
						<Input
							id="signup-name"
							autoComplete="name"
							value={fullName}
							onChange={(e) => {
								setFullName(e.target.value);
								setErrors((prev) => withoutError(prev, "fullName"));
							}}
							aria-invalid={!!errors.fullName || undefined}
							aria-describedby={errors.fullName ? "signup-name-error" : undefined}
							className="h-12"
						/>
						<FieldError id="signup-name-error" message={errors.fullName} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="signup-email">{t("auth.email")}</Label>
						<Input
							id="signup-email"
							type="email"
							inputMode="email"
							autoComplete="email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								setErrors((prev) => withoutError(prev, "email"));
							}}
							aria-invalid={!!errors.email || undefined}
							aria-describedby={errors.email ? "signup-email-error" : undefined}
							className="h-12"
						/>
						<FieldError id="signup-email-error" message={errors.email} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="signup-password">{t("auth.password")}</Label>
						<PasswordField
							id="signup-password"
							value={password}
							onChange={(value) => {
								setPassword(value);
								setErrors((prev) => withoutError(prev, "password"));
							}}
							autoComplete="new-password"
							describedBy="signup-password-strength"
							invalid={!!errors.password}
						/>
						<FieldError id="signup-password-error" message={errors.password} />
						<PasswordStrength id="signup-password-strength" password={password} />
					</div>
					<FormError message={errors.form} />
					<Button type="submit" className="h-12 w-full text-base">
						{t("signup.continue")}
					</Button>
				</form>
			) : (
				<form onSubmit={create} noValidate className="space-y-5">
					<div>
						<h2 className="font-display text-2xl font-bold">{t("signup.shopTitle")}</h2>
						<p className="mt-1 text-sm text-muted-foreground">{t("signup.shopSubtitle")}</p>
					</div>
					<ShopFields
						value={shop}
						onChange={(nextShop) => {
							setShopErrors((prev) => clearChangedShopErrors(prev, shop, nextShop));
							setShop(nextShop);
						}}
						errors={shopErrors}
					/>
					<FormError message={errors.form} />
					<div className="flex gap-2">
						<Button type="button" variant="outline" className="h-12" onClick={() => setStep(1)} disabled={submitting}>
							<ArrowLeft className="h-4 w-4" />
							{t("signup.back")}
						</Button>
						<Button type="submit" className="h-12 flex-1 text-base" disabled={submitting}>
							{submitting && <Loader2 className="h-4 w-4 animate-spin" />}
							{submitting ? t("signup.creating") : t("signup.create")}
						</Button>
					</div>
					<p className="text-center text-xs text-muted-foreground">{t("signup.terms")}</p>
				</form>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

function ForgotPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string>();
	const [sending, setSending] = useState(false);

	const send = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!emailSchema.safeParse(email).success) return setError(t("auth.errors.invalidEmail"));
		setError(undefined);
		setSending(true);
		const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		setSending(false);
		if (sendError && sendError.status === 429) return setError(sendError.message);
		// Same answer whether or not the account exists, so emails can't be probed.
		toast.success(t("reset.sent", { email: email.trim() }));
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("reset.title")}</DialogTitle>
					<DialogDescription>{t("reset.subtitle")}</DialogDescription>
				</DialogHeader>
				<form onSubmit={send} noValidate className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="reset-email">{t("auth.email")}</Label>
						<Input
							id="reset-email"
							type="email"
							inputMode="email"
							autoComplete="email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								setError(undefined);
							}}
							aria-invalid={!!error || undefined}
							aria-describedby={error ? "reset-email-error" : undefined}
							className="h-12"
						/>
						<FieldError id="reset-email-error" message={error} />
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{t("reset.cancel")}
						</Button>
						<Button type="submit" disabled={sending}>
							{sending && <Loader2 className="h-4 w-4 animate-spin" />}
							{sending ? t("reset.sending") : t("reset.send")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------

const Auth = () => {
	const { t } = useTranslation();
	const { user, loading } = useAuth();
	const [tab, setTab] = useState<"signin" | "signup">("signin");
	const [forgotOpen, setForgotOpen] = useState(false);

	useEffect(() => {
		document.title = `${tab === "signin" ? t("auth.signInTab") : t("auth.signUpTab")} · Style2Fit`;
	}, [tab, t]);

	if (loading) return null;
	if (user) return <Navigate to="/" replace />;

	const switchLink = (label: string, to: "signin" | "signup") => (
		<button
			type="button"
			onClick={() => setTab(to)}
			className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{label}
		</button>
	);

	return (
		<div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
			{/* Brand panel — desktop */}
			<aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
				<Logo on="dark" size="lg" />
				<div className="max-w-md space-y-6">
					<h1 className="font-display text-5xl font-bold leading-[1.05] text-balance">{t("brand.tagline")}</h1>
					<p className="text-lg text-primary-foreground/80">{t("brand.pitch")}</p>
				</div>
				<p className="text-xs uppercase tracking-widest text-primary-foreground/60">{t("brand.footer")}</p>
			</aside>

			<main className="flex flex-col">
				{/* Brand header — phone & tablet */}
				<div className="flex flex-col bg-gradient-hero px-5 pb-8 pt-6 text-primary-foreground lg:hidden">
					<Logo on="dark" size="md" />
					<p className="mt-4 font-display text-2xl font-bold leading-tight">{t("brand.tagline")}</p>
				</div>

				<div className="-mt-4 flex flex-1 justify-center rounded-t-3xl bg-background px-5 py-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none">
					<div className="w-full max-w-md">
						<Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
							<TabsList className="mb-8 grid h-12 w-full grid-cols-2">
								<TabsTrigger value="signin" className="h-10 text-sm">
									{t("auth.signInTab")}
								</TabsTrigger>
								<TabsTrigger value="signup" className="h-10 text-sm">
									{t("auth.signUpTab")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="signin" className="space-y-6">
								<div>
									<h2 className="font-display text-2xl font-bold">{t("auth.welcomeBack")}</h2>
									<p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>
								</div>
								<SignInForm onForgot={() => setForgotOpen(true)} />
								<p className="text-center text-sm text-muted-foreground">
									{t("auth.noAccount")} {switchLink(t("auth.createOne"), "signup")}
								</p>
							</TabsContent>

							<TabsContent value="signup" className="space-y-6">
								<SignUpForm />
								<p className="text-center text-sm text-muted-foreground">
									{t("auth.haveAccount")} {switchLink(t("auth.signInInstead"), "signin")}
								</p>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</main>

			<ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
		</div>
	);
};

export default Auth;
