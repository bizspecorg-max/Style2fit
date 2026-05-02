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
import { toast } from "sonner";
import { Loader2, Phone, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		business_name: "",
		full_name: "",
		phone: "",
	});

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

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth");
	};

	const supportWhatsApp = () => {
		// Auto‑fill message with user email and app name
		const message = `Hello! I need help with my Style2Fit account.\n\nUser email: ${user?.email || "Not logged in"}\n\nIssue: (Please describe your problem)`;
		const url = `https://wa.me/2347035599433?text=${encodeURIComponent(message)}`;
		window.open(url, "_blank");
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center min-h-[60vh]">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
			<div>
				<h1 className="font-display text-3xl font-bold">Profile</h1>
				<p className="text-sm text-muted-foreground">
					Manage your business information
				</p>
			</div>

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
		</div>
	);
};

export default Profile;
