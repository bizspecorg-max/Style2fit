import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Phone, LogOut, CreditCard, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const Profile = () => {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Business form
	const [form, setForm] = useState({
		business_name: "",
		full_name: "",
		phone: "",
	});

	// Password change state
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changingPassword, setChangingPassword] = useState(false);

	// Subscription modal and confirmation message
	const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
	const [paymentConfirmed, setPaymentConfirmed] = useState(false);

	const {
		data: subscription,
		isLoading: subLoading,
		refetch,
	} = useSubscription();

	useEffect(() => {
		document.title = "Profile · Style2Fit";
		if (!user) return;

		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select("business_name, full_name, phone")
				.eq("id", user.id)
				.single();

			if (error) {
				console.error(error);
				toast.error("Could not load profile");
			} else if (data) {
				setForm({
					business_name: data.business_name || "",
					full_name: data.full_name || "",
					phone: data.phone || "",
				});
			}
			setLoading(false);
		};

		fetchProfile();
	}, [user]);

	const expiredParam = searchParams.get("expired");

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setSaving(true);
		const { error } = await supabase
			.from("profiles")
			.update({
				business_name: form.business_name,
				full_name: form.full_name,
				phone: form.phone,
			})
			.eq("id", user.id);

		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Profile updated");
		}
		setSaving(false);
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}
		if (newPassword.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		if (!currentPassword) {
			toast.error("Please enter your current password");
			return;
		}

		setChangingPassword(true);
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: user.email!,
			password: currentPassword,
		});
		if (signInError) {
			toast.error("Current password is incorrect");
			setChangingPassword(false);
			return;
		}

		const { error } = await supabase.auth.updateUser({ password: newPassword });
		setChangingPassword(false);

		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Password updated successfully");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		}
	};

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth");
	};

	const supportWhatsApp = () => {
		const message = `Hello! I need help with my Style2Fit account.\n\nUser email: ${user?.email || "Not logged in"}\n\nIssue: (Please describe your problem)`;
		const url = `https://wa.me/2347035599433?text=${encodeURIComponent(message)}`;
		window.open(url, "_blank");
	};

	const handlePaymentConfirmed = () => {
		setSubscribeModalOpen(false);
		setPaymentConfirmed(true);
		toast.success("Thank you! We will update your account soon.");
	};

	const notifySupportAfterPayment = () => {
		const message = `Hello, I have made a payment for my Style2Fit subscription.\n\nEmail: ${user?.email}\nAmount: ₦5,000\nPaid via Opay (7035599433).\nPlease activate my account.`;
		const url = `https://wa.me/2347035599433?text=${encodeURIComponent(message)}`;
		window.open(url, "_blank");
	};

	// Calculate trial length from subscription start and end
	const getTrialLength = () => {
		if (!subscription || subscription.status !== "trial") return 7; // fallback
		const start = new Date(subscription.trial_start);
		const end = new Date(subscription.trial_end);
		const diffDays = Math.ceil(
			(end.getTime() - start.getTime()) / (1000 * 3600 * 24)
		);
		return diffDays > 0 ? diffDays : 14; // default to 14 if calculation fails
	};

	const getRemainingDays = () => {
		if (!subscription || subscription.status !== "trial") return 0;
		const endDate = new Date(subscription.trial_end);
		const today = new Date();
		endDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		const diffTime = endDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays > 0 ? diffDays : 0;
	};

	// Show loading spinner while data loads
	if (loading || subLoading) {
		return <LoadingSpinner message="Loading your profile, please wait..." />;
	}

	const remainingDays = getRemainingDays();
	const trialLength = getTrialLength();
	const isTrialValid = subscription?.status === "trial" && remainingDays > 0;
	const isActive = subscription?.status === "active";

	return (
		<div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
			<div>
				<h1 className="font-display text-3xl font-bold">Profile</h1>
				<p className="text-sm text-muted-foreground">
					Manage your business information
				</p>
			</div>

			{expiredParam === "true" && !isActive && !isTrialValid && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-4">
						<p className="text-red-700 text-sm">
							Your trial has expired. Please subscribe to continue using all
							features.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Business details card */}
			<Card>
				<form onSubmit={handleUpdate}>
					<CardHeader>
						<CardTitle>Business details</CardTitle>
						<CardDescription>
							Update your tailor shop information
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="business_name">Business name</Label>
							<Input
								id="business_name"
								value={form.business_name}
								onChange={(e) =>
									setForm({ ...form, business_name: e.target.value })
								}
								placeholder="e.g. Ade Couture"
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="full_name">Your full name</Label>
							<Input
								id="full_name"
								value={form.full_name}
								onChange={(e) =>
									setForm({ ...form, full_name: e.target.value })
								}
								placeholder="Ade Olu"
								className="h-11"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="phone">Phone number</Label>
							<Input
								id="phone"
								type="tel"
								value={form.phone}
								onChange={(e) => setForm({ ...form, phone: e.target.value })}
								placeholder="+2348012345678"
								className="h-11"
							/>
						</div>
						<div className="flex gap-3 pt-2">
							<Button type="submit" disabled={saving} className="flex-1">
								{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								Save changes
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={handleSignOut}
								className="gap-2"
							>
								<LogOut className="h-4 w-4" /> Sign out
							</Button>
						</div>
					</CardContent>
				</form>
			</Card>

			{/* Change Password Card */}
			<Card>
				<CardHeader>
					<CardTitle>Change password</CardTitle>
					<CardDescription>Update your login password</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleChangePassword} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">Current password</Label>
							<div className="relative">
								<Input
									id="currentPassword"
									type={showCurrentPassword ? "text" : "password"}
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									className="h-11 pr-10"
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								>
									{showCurrentPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="newPassword">
								New password (min 6 characters)
							</Label>
							<div className="relative">
								<Input
									id="newPassword"
									type={showNewPassword ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="h-11 pr-10"
									required
									minLength={6}
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									onClick={() => setShowNewPassword(!showNewPassword)}
								>
									{showNewPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm new password</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="h-11 pr-10"
									required
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
							disabled={changingPassword}
							className="w-full"
						>
							{changingPassword && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Update password
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Subscription Card - updated with dynamic trial length */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" /> Subscription
					</CardTitle>
					<CardDescription>Your plan and trial status</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{!isActive && (isTrialValid || subscription?.status === "trial") && (
						<>
							<p className="text-sm">
								You are on a <strong>{trialLength}-day free trial</strong>.
							</p>
							{remainingDays > 0 && (
								<p className="text-sm font-medium text-primary">
									⏳ {remainingDays} day{remainingDays !== 1 ? "s" : ""}{" "}
									remaining in trial
								</p>
							)}
							<div className="bg-muted p-3 rounded-lg text-sm">
								<p className="font-medium">📱 Payment details (Opay):</p>
								<p className="font-mono mt-1">703 559 9433</p>
								<p className="text-xs text-muted-foreground mt-1">
									Amount: ₦5,000 / month
								</p>
							</div>
							<Button
								onClick={() => setSubscribeModalOpen(true)}
								className="w-full bg-green-600 hover:bg-green-700"
							>
								Upgrade to paid plan – ₦5,000 / month
							</Button>
							<p className="text-xs text-muted-foreground">
								After payment, we will activate your account within 30min.
							</p>
						</>
					)}

					{isActive && (
						<>
							<p className="text-sm text-green-600 font-medium">
								✓ Subscription active
							</p>
							<p className="text-sm">
								Valid until:{" "}
								{subscription?.paid_until
									? new Date(subscription.paid_until).toLocaleDateString()
									: "recurring"}
							</p>
							<Button
								onClick={() => setSubscribeModalOpen(true)}
								variant="outline"
								className="w-full"
							>
								Renew / Extend (₦5,000)
							</Button>
						</>
					)}

					{!isActive && !isTrialValid && (
						<>
							<p className="text-sm text-red-600">
								{subscription?.status === "expired"
									? "Your trial has expired. Please subscribe to continue."
									: "No active subscription. Subscribe to access all features."}
							</p>
							<div className="bg-muted p-3 rounded-lg text-sm">
								<p className="font-medium">📱 Payment details (Opay):</p>
								<p className="font-mono mt-1">703 559 9433</p>
								<p className="text-xs text-muted-foreground mt-1">
									Amount: ₦5,000 / month
								</p>
							</div>
							<Button
								onClick={() => setSubscribeModalOpen(true)}
								className="w-full bg-green-600 hover:bg-green-700"
							>
								Subscribe – ₦5,000 / month
							</Button>
							<p className="text-xs text-muted-foreground">
								After payment, we will activate your account manually.
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Payment confirmation card */}
			{paymentConfirmed && (
				<Card className="border-green-200 bg-green-50">
					<CardHeader>
						<CardTitle className="text-green-700">
							✓ Payment notification sent
						</CardTitle>
						<CardDescription>
							We have received your confirmation. We will update your account
							shortly.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm">
							For faster activation, please send a message to our support team
							with your email address.
						</p>
						<Button
							onClick={notifySupportAfterPayment}
							className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
						>
							<Phone className="h-4 w-4" /> Contact Support on WhatsApp
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Support card */}
			<Card>
				<CardHeader>
					<CardTitle>Need help?</CardTitle>
					<CardDescription>Get in touch with our support team</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						type="button"
						variant="secondary"
						onClick={supportWhatsApp}
						className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
					>
						<Phone className="h-4 w-4" /> Contact WhatsApp Support
					</Button>
				</CardContent>
			</Card>

			{/* Subscription payment modal */}
			<Dialog open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Subscription payment</DialogTitle>
						<DialogDescription>
							Complete your payment to continue using Style2Fit.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="bg-muted p-4 rounded-lg">
							<p className="font-medium">📱 Opay account details</p>
							<p className="font-mono text-xl mt-2">703 559 9433</p>
							<p className="text-sm mt-1">
								Account name: <strong>Style2Fit</strong>
							</p>
							<p className="text-sm">
								Amount: <strong>₦5,000</strong> (monthly)
							</p>
						</div>
						<p className="text-sm text-muted-foreground">
							After making the payment, click the button below to notify us. We
							will activate your account as soon as possible.
						</p>
					</div>
					<DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
						<Button
							variant="outline"
							onClick={() => setSubscribeModalOpen(false)}
							className="sm:flex-1"
						>
							Cancel
						</Button>
						<Button
							onClick={handlePaymentConfirmed}
							className="bg-green-600 hover:bg-green-700 sm:flex-1"
						>
							I have made payment
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Profile;
