import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/** Signed-in users only. Accounts without a shop country are sent to onboarding once. */
export const ProtectedRoute = ({
	children,
	requireShop = true,
}: {
	children: React.ReactNode;
	requireShop?: boolean;
}) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
			</div>
		);
	}
	if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
	if (requireShop && !user.user_metadata?.country) return <Navigate to="/onboarding" replace />;
	return <>{children}</>;
};
