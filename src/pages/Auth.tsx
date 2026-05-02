import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Scissors, Loader2 } from "lucide-react";

const signInSchema = z.object({
	email: z.string().email("Invalid email").max(255),
	password: z.string().min(6, "Min 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
	business_name: z.string().trim().min(1, "Required").max(100),
	full_name: z.string().trim().min(1, "Required").max(100),
	phone: z.string().trim().min(7, "Enter a valid phone").max(20),
});

const Auth = () => {
	const { user, loading, signIn, signUp } = useAuth();
	const navigate = useNavigate();
	const [tab, setTab] = useState<"signin" | "signup">("signin");
	const [submitting, setSubmitting] = useState(false);

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
			business_name: fd.get("business_name"),
			full_name: fd.get("full_name"),
			phone: fd.get("phone"),
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		setSubmitting(true);
		const { error } = await signUp(parsed.data as Required<typeof parsed.data>);
		setSubmitting(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Account created — you're in!");
		navigate("/", { replace: true });
	};

	return (
		<div className="min-h-screen grid md:grid-cols-2">
			{/* Brand panel - desktop (unchanged) */}
			<div className="hidden md:flex flex-col justify-between p-10 bg-gradient-hero text-primary-foreground">
				<div className="flex items-center gap-2">
					<div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
						<Scissors className="h-5 w-5 text-accent-foreground" />
					</div>
					<span className="font-display text-2xl font-bold">Style2Fit</span>
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

			{/* Form section – now with mobile brand header */}
			<div className="flex items-center justify-center p-6 md:p-10 bg-background">
				<div className="w-full max-w-md">
					{/* Mobile brand header (visible only on small screens) */}
					<div className="md:hidden flex flex-col items-center text-center mb-8 p-4 rounded-xl bg-gradient-hero text-primary-foreground">
						<div className="h-12 w-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold mb-3">
							<Scissors className="h-6 w-6 text-accent-foreground" />
						</div>
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
								<Field
									id="password"
									label="Password"
									type="password"
									autoComplete="current-password"
									required
								/>
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
								<Field
									id="password"
									label="Password (min 6)"
									type="password"
									autoComplete="new-password"
									required
								/>
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
