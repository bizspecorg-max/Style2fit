// Every screen's code, loaded on demand. Kept in one place so the app can also fetch them ahead of time.
export const pages = {
	Landing: () => import("@/pages/Landing"),
	Auth: () => import("@/pages/Auth"),
	ResetPassword: () => import("@/pages/ResetPassword"),
	Onboarding: () => import("@/pages/Onboarding"),
	Dashboard: () => import("@/pages/Dashboard"),
	Customers: () => import("@/pages/Customers"),
	CustomerDetail: () => import("@/pages/CustomerDetail"),
	NewOrder: () => import("@/pages/NewOrder"),
	OrderDetail: () => import("@/pages/OrderDetail"),
	Styles: () => import("@/pages/Styles"),
	Orders: () => import("@/pages/Orders"),
	Profile: () => import("@/pages/Profile"),
	QuickMeasure: () => import("@/pages/QuickMeasure"),
	NotFound: () => import("@/pages/NotFound"),
};

let preloaded = false;

/** Once the browser is idle, download every screen so opening a module never waits on the network. */
export function preloadPages() {
	if (preloaded) return;
	preloaded = true;
	const run = () => Object.values(pages).forEach((load) => load().catch(() => {}));
	if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2500 });
	else setTimeout(run, 1200);
}
