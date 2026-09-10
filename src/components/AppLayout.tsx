import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, LayoutDashboard, LogOut, Plus, Ruler, Shirt, User, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { PageFallback } from "@/components/PageFallback";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/shop";
import { cn } from "@/lib/utils";

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; end?: boolean };

const WORKSPACE: NavItem[] = [
	{ to: "/", labelKey: "nav.home", icon: LayoutDashboard, end: true },
	{ to: "/customers", labelKey: "nav.customers", icon: Users },
	{ to: "/orders", labelKey: "nav.orders", icon: ClipboardList },
	{ to: "/styles", labelKey: "nav.styles", icon: Shirt },
];
const TOOLS: NavItem[] = [{ to: "/quick-measure", labelKey: "nav.quickMeasure", icon: Ruler }];

function useAccount() {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
	const business = typeof meta.business_name === "string" && meta.business_name ? meta.business_name : "Style2Fit";
	return {
		business,
		email: user?.email ?? "",
		signOut: async () => {
			await signOut();
			navigate("/auth", { replace: true });
		},
	};
}

function AccountMenu({ align, children }: { align: "start" | "end"; children: React.ReactNode }) {
	const { t } = useTranslation();
	const account = useAccount();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="w-60">
				<DropdownMenuLabel className="font-normal">
					<span className="block truncate font-medium">{account.business}</span>
					<span className="block truncate text-xs text-muted-foreground">{account.email}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/profile">
						<User className="mr-2 h-4 w-4" />
						{t("nav.profile")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={account.signOut} className="text-destructive focus:text-destructive">
					<LogOut className="mr-2 h-4 w-4" />
					{t("nav.signOut")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function SidebarLink({ item }: { item: NavItem }) {
	const { t } = useTranslation();
	return (
		<NavLink
			to={item.to}
			end={item.end}
			className={({ isActive }) =>
				cn(
					"flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
					isActive
						? "bg-sidebar-accent font-semibold text-sidebar-primary"
						: "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
				)
			}
		>
			<item.icon className="h-4 w-4" />
			{t(item.labelKey)}
		</NavLink>
	);
}

function BottomLink({ item }: { item: NavItem }) {
	const { t } = useTranslation();
	return (
		<NavLink
			to={item.to}
			end={item.end}
			className={({ isActive }) =>
				cn(
					"flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
					isActive ? "text-primary" : "text-muted-foreground"
				)
			}
		>
			{({ isActive }) => (
				<>
					<item.icon className={cn("h-5 w-5", isActive && "stroke-[2.4]")} />
					{t(item.labelKey)}
				</>
			)}
		</NavLink>
	);
}

export const AppLayout = () => {
	const { t } = useTranslation();
	const account = useAccount();

	return (
		<div className="min-h-dvh bg-background md:pl-64">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
			>
				{t("nav.skip")}
			</a>

			{/* Sidebar — desktop */}
			<aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
				<div className="flex px-6 py-6">
					<Logo on="dark" size="md" />
				</div>
				<nav aria-label={t("nav.main")} className="flex-1 space-y-6 px-3">
					<div className="space-y-1">
						{WORKSPACE.map((item) => (
							<SidebarLink key={item.to} item={item} />
						))}
					</div>
					<div className="space-y-1">
						<p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">{t("nav.tools")}</p>
						{TOOLS.map((item) => (
							<SidebarLink key={item.to} item={item} />
						))}
					</div>
				</nav>
				<div className="p-3">
					<AccountMenu align="start">
						<button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground" aria-hidden>
								{initials(account.business)}
							</span>
							<span className="min-w-0">
								<span className="block truncate text-sm font-medium">{account.business}</span>
								<span className="block truncate text-xs text-sidebar-foreground/60">{account.email}</span>
							</span>
						</button>
					</AccountMenu>
				</div>
			</aside>

			{/* Top bar — phone */}
			<header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:hidden">
				<div className="flex h-14 items-center justify-between px-4">
					<Link to="/" aria-label={t("nav.home")} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<Logo size="sm" />
					</Link>
					<AccountMenu align="end">
						<button
							aria-label={t("nav.account")}
							className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							{initials(account.business)}
						</button>
					</AccountMenu>
				</div>
			</header>

			<main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 focus:outline-none md:px-8 md:pb-12 md:pt-10">
				<Suspense fallback={<PageFallback />}>
					<Outlet />
				</Suspense>
			</main>

			{/* Bottom navigation — phone */}
			<nav
				aria-label={t("nav.main")}
				className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
			>
				<div className="grid h-16 grid-cols-5">
					<BottomLink item={WORKSPACE[0]} />
					<BottomLink item={WORKSPACE[1]} />
					<div className="flex items-center justify-center">
						<Link
							to="/orders?new=1"
							aria-label={t("nav.newOrder")}
							className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated ring-4 ring-background focus-visible:outline-none focus-visible:ring-accent"
						>
							<Plus className="h-6 w-6" />
						</Link>
					</div>
					<BottomLink item={WORKSPACE[2]} />
					<BottomLink item={WORKSPACE[3]} />
				</div>
			</nav>
		</div>
	);
};
