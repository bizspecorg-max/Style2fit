import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Check if we have a valid reset session
		const checkSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) {
				toast.error("Invalid or expired reset link");
				navigate("/auth");
			}
		};
		checkSession();
	}, [navigate]);

	const handleReset = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}
		if (password.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}
		setLoading(true);
		const { error } = await supabase.auth.updateUser({ password });
		setLoading(false);
		if (error) {
			toast.error(error.message);
		} else {
			toast.success("Password updated! Please sign in.");
			navigate("/auth");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Reset your password</CardTitle>
					<CardDescription>Enter your new password below.</CardDescription>
				</CardHeader>
				<form onSubmit={handleReset}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="password">New password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm new password</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
							/>
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Update password
						</Button>
					</CardContent>
				</form>
			</Card>
		</div>
	);
};

export default ResetPassword;
