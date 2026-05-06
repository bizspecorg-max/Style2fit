import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const signInSchema = z.object({
	email: z.string().email("Invalid email").max(255),
	password: z.string().min(6, "Min 6 characters").max(72),
});

const signUpSchema = signInSchema
	.extend({
		business_name: z.string().trim().min(1, "Required").max(100),
		full_name: z.string().trim().min(1, "Required").max(100),
		phone: z.string().trim().min(7, "Enter a valid phone").max(20),
		confirmPassword: z.string().min(6, "Min 6 characters"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

// ----------------------------------------------------------------------
// Forgot Password Modal (unchanged)
// ----------------------------------------------------------------------
const ForgotPasswordModal = ({
	open,
	onClose,
	onSend,
}: {
	open: boolean;
	onClose: () => void;
	onSend: (email: string) => Promise<void>;
}) => {
	const [email, setEmail] = useState("");
	const [sending, setSending] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			toast.error("Please enter your email address");
			return;
		}
		setSending(true);
		await onSend(email);
		setSending(false);
		onClose();
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
				<h2 className="text-xl font-bold mb-2">Reset your password</h2>
				<p className="text-sm text-muted-foreground mb-4">
					Enter your email address and we'll send you a link to reset your
					password.
				</p>
				<form onSubmit={handleSubmit}>
					<Input
						type="email"
						placeholder="your@email.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mb-4 h-11"
						required
					/>
					<div className="flex gap-2 justify-end">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={sending}>
							{sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
							Send reset link
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ----------------------------------------------------------------------
const Auth = () => {
	const { user, loading, signIn, signUp } = useAuth();
	const navigate = useNavigate();
	const [tab, setTab] = useState<"signin" | "signup">("signin");
	const [submitting, setSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [forgotOpen, setForgotOpen] = useState(false);

	useEffect(() => {
		document.title = "Sign in · Style2Fit";
	}, []);

	if (loading) return null;
	if (user) return <Navigate to="/" replace />;

	const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const parsed = signInSchema.safeParse({
			email: fd.get("email"),
			password: fd.get("password"),
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		setSubmitting(true);
		const { error } = await signIn(parsed.data.email, parsed.data.password);
		setSubmitting(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Welcome back!");
		navigate("/", { replace: true });
	};

	const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const parsed = signUpSchema.safeParse({
			email: fd.get("email"),
			password: fd.get("password"),
			confirmPassword: fd.get("confirmPassword"),
			business_name: fd.get("business_name"),
			full_name: fd.get("full_name"),
			phone: fd.get("phone"),
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		setSubmitting(true);
		const { error } = await signUp({
			email: parsed.data.email,
			password: parsed.data.password,
			business_name: parsed.data.business_name,
			full_name: parsed.data.full_name,
			phone: parsed.data.phone,
		});
		setSubmitting(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Account created — you're in!");
		navigate("/", { replace: true });
	};

	const handleSendReset = async (email: string) => {
		const productionUrl = "https://style2fit.vercel.app";
		const redirectUrl =
			import.meta.env.PROD || window.location.hostname !== "localhost"
				? `${productionUrl}/reset-password`
				: `${window.location.origin}/reset-password`;

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: redirectUrl,
		});
		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Password reset link sent! Check your email.");
		}
	};

	// Logo URL
	const logoUrl =
		"https://res.cloudinary.com/dfmigbgri/image/upload/v1778103874/Stlye_2fit_rxojiu.png";

	return (
		<div className="min-h-screen grid md:grid-cols-2">
			{/* Brand panel - desktop (updated with logo image) */}
			<div className="hidden md:flex flex-col justify-between p-10 bg-gradient-hero text-primary-foreground">
				<div className="flex items-center gap-2">
					<img
						src={logoUrl}
						alt="Style2Fit"
						className="h-10 w-auto object-contain"
					/>
					<span className="font-display text-2xl font-bold"></span>
				</div>
				<div className="space-y-6 max-w-sm">
					<h1 className="font-display text-5xl font-bold leading-[1.05] text-balance">
						Throw away the <span className="text-accent">measurement book</span>
						.
					</h1>
					<p className="text-primary-foreground/80 text-lg">
						One place for customers, styles, measurements, and orders. Built for
						busy tailors.
					</p>
				</div>
				<p className="text-xs uppercase tracking-widest text-primary-foreground/50">
					Tailor OS · v1
				</p>
			</div>

			{/* Form section – mobile brand header updated with logo */}
			<div className="flex items-center justify-center p-5 md:p-10 bg-background">
				<div className="w-full max-w-md">
					{/* Mobile brand header – now with logo image */}
					<div className="md:hidden flex flex-col items-center text-center mb-6 p-4 rounded-xl bg-gradient-hero text-primary-foreground">
						<img
							src={logoUrl}
							alt="Style2Fit"
							className="h-12 w-auto object-contain mb-2"
						/>
						<span className="font-display text-2xl font-bold">Style2Fit</span>
						<p className="text-sm text-primary-foreground/80 mt-2 max-w-xs">
							Throw away the measurement book. One place for customers, styles,
							and orders.
						</p>
					</div>

					<Tabs
						value={tab}
						onValueChange={(v) => setTab(v as "signin" | "signup")}
					>
						<TabsList className="grid grid-cols-2 w-full mb-6">
							<TabsTrigger value="signin">Sign in</TabsTrigger>
							<TabsTrigger value="signup">Create account</TabsTrigger>
						</TabsList>

						<TabsContent value="signin">
							<form onSubmit={handleSignIn} className="space-y-4">
								<Field
									id="email"
									label="Email"
									type="email"
									autoComplete="email"
									required
								/>
								<div className="space-y-1.5">
									<Label htmlFor="password">Password</Label>
									<div className="relative">
										<Input
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											className="h-12 pr-10"
											autoComplete="current-password"
											required
										/>
										<button
											type="button"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											onClick={() => setShowPassword(!showPassword)}
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
								<div className="text-right">
									<button
										type="button"
										onClick={() => setForgotOpen(true)}
										className="text-xs text-primary underline-offset-2 hover:underline"
									>
										Forgot password?
									</button>
								</div>
								<Button
									type="submit"
									className="w-full h-12 text-base"
									disabled={submitting}
								>
									{submitting && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Sign in
								</Button>
							</form>
						</TabsContent>

						<TabsContent value="signup">
							<form onSubmit={handleSignUp} className="space-y-4">
								<Field
									id="business_name"
									label="Business name"
									placeholder="e.g. Ade Couture"
									required
								/>
								<Field id="full_name" label="Your full name" required />
								<Field
									id="phone"
									label="Phone number"
									type="tel"
									inputMode="tel"
									required
								/>
								<Field
									id="email"
									label="Email"
									type="email"
									autoComplete="email"
									required
								/>
								<div className="space-y-1.5">
									<Label htmlFor="password">Password (min 6)</Label>
									<div className="relative">
										<Input
											id="password"
											name="password"
											type={showPassword ? "text" : "password"}
											className="h-12 pr-10"
											autoComplete="new-password"
											required
										/>
										<button
											type="button"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											onClick={() => setShowPassword(!showPassword)}
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="confirmPassword">Confirm password</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											name="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											className="h-12 pr-10"
											autoComplete="off"
											required
										/>
										<button
											type="button"
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}
										>
											{showConfirmPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
								<Button
									type="submit"
									className="w-full h-12 text-base"
									disabled={submitting}
								>
									{submitting && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Create account
								</Button>
							</form>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Forgot Password Modal */}
			<ForgotPasswordModal
				open={forgotOpen}
				onClose={() => setForgotOpen(false)}
				onSend={handleSendReset}
			/>
		</div>
	);
};

const Field = ({
	id,
	label,
	...rest
}: {
	id: string;
	label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
	<div className="space-y-1.5">
		<Label htmlFor={id}>{label}</Label>
		<Input id={id} name={id} className="h-12" {...rest} />
	</div>
);

export default Auth;
