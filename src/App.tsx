import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Styles from "./pages/Styles";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import QuickMeasure from "./pages/QuickMeasure";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Scroll to top on route change
function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname]);
	return null;
}

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<ScrollToTop />
				<AuthProvider>
					<Routes>
						<Route path="/auth" element={<Auth />} />
						<Route path="/reset-password" element={<ResetPassword />} />
						<Route
							element={
								<ProtectedRoute>
									<AppLayout />
								</ProtectedRoute>
							}
						>
							<Route path="/" element={<Dashboard />} />
							<Route path="/customers" element={<Customers />} />
							<Route path="/styles" element={<Styles />} />
							<Route path="/orders" element={<Orders />} />
							<Route path="/profile" element={<Profile />} />
							<Route path="/quick-measure" element={<QuickMeasure />} />
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</AuthProvider>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;

// In main.tsx, before rendering
if ("ontouchstart" in window) {
	// Disable auto-focus on mobile devices
	document.body.style.touchAction = "manipulation";
}
