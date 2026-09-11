import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageFallback } from "@/components/PageFallback";
import { pages } from "@/lib/pages";

const Landing = lazy(pages.Landing);

/**
 * Signed-in users only. Visitors to "/" see the landing page instead of being sent to sign-in;
 * accounts without a shop country are sent to onboarding once.
 */
export const ProtectedRoute = ({
	children,
	requireShop = true,
}: {
	children: React.ReactNode;
	requireShop?: boolean;
}) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) return <PageFallback fullScreen />;
	if (!user) {
		if (location.pathname === "/") {
			return (
				<Suspense fallback={<PageFallback fullScreen />}>
					<Landing />
				</Suspense>
			);
		}
		return <Navigate to="/auth" state={{ from: location }} replace />;
	}
	if (requireShop && !user.user_metadata?.country) return <Navigate to="/onboarding" replace />;
	return <>{children}</>;
};
