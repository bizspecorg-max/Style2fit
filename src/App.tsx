import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PageFallback } from "@/components/PageFallback";

// Each screen downloads only when it's first opened, so the first visit stays small.
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Styles = lazy(() => import("./pages/Styles"));
const Orders = lazy(() => import("./pages/Orders"));
const Profile = lazy(() => import("./pages/Profile"));
const QuickMeasure = lazy(() => import("./pages/QuickMeasure"));
const NotFound = lazy(() => import("./pages/NotFound"));

// One cache for the whole app: revisiting a screen shows data instantly.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			gcTime: 1000 * 60 * 30,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

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
			<Sonner position="top-center" richColors closeButton />
			<BrowserRouter>
				<ScrollToTop />
				<AuthProvider>
					<Suspense fallback={<PageFallback fullScreen />}>
						<Routes>
							<Route path="/auth" element={<Auth />} />
							<Route path="/reset-password" element={<ResetPassword />} />
							<Route
								path="/onboarding"
								element={
									<ProtectedRoute requireShop={false}>
										<Onboarding />
									</ProtectedRoute>
								}
							/>
							<Route
								element={
									<ProtectedRoute>
										<AppLayout />
									</ProtectedRoute>
								}
							>
								<Route path="/" element={<Dashboard />} />
								<Route path="/customers" element={<Customers />} />
								<Route path="/customers/:id" element={<CustomerDetail />} />
								<Route path="/styles" element={<Styles />} />
								<Route path="/orders" element={<Orders />} />
								<Route path="/profile" element={<Profile />} />
								<Route path="/quick-measure" element={<QuickMeasure />} />
							</Route>
							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				</AuthProvider>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
