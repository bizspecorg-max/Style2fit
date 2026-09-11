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
import { pages } from "@/lib/pages";

// Each screen is its own small download; AppLayout fetches the rest in the background after sign-in.
const Landing = lazy(pages.Landing);
const Auth = lazy(pages.Auth);
const ResetPassword = lazy(pages.ResetPassword);
const Onboarding = lazy(pages.Onboarding);
const Dashboard = lazy(pages.Dashboard);
const Customers = lazy(pages.Customers);
const CustomerDetail = lazy(pages.CustomerDetail);
const NewOrder = lazy(pages.NewOrder);
const OrderDetail = lazy(pages.OrderDetail);
const Styles = lazy(pages.Styles);
const Orders = lazy(pages.Orders);
const Profile = lazy(pages.Profile);
const QuickMeasure = lazy(pages.QuickMeasure);
const NotFound = lazy(pages.NotFound);

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
							<Route path="/welcome" element={<Landing />} />
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
								<Route path="/orders/new" element={<NewOrder />} />
								<Route path="/orders/:id" element={<OrderDetail />} />
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
