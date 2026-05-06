import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
	LayoutDashboard,
	Users,
	Shirt,
	ClipboardList,
	LogOut,
	Ruler,
	User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	end?: boolean;
};

const mainNav: NavItem[] = [
	{ to: "/", label: "Home", icon: LayoutDashboard, end: true },
	{ to: "/customers", label: "Customers", icon: Users },
	{ to: "/styles", label: "Styles", icon: Shirt },
	{ to: "/orders", label: "Orders", icon: ClipboardList },
	{ to: "/quick-measure", label: "Measure", icon: Ruler },
];

const secondaryNav: NavItem[] = [
	{ to: "/profile", label: "Profile", icon: User },
];

export const AppLayout = () => {
	const { signOut } = useAuth();
	const navigate = useNavigate();

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth", { replace: true });
	};

	const logoUrl =
		"https://res.cloudinary.com/dfmigbgri/image/upload/v1778103874/Stlye_2fit_rxojiu.png";

	return (
		<div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
			{/* Sidebar (desktop) */}
			<aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
				<div className="px-6 py-6 flex items-center gap-2">
					<img
						src={logoUrl}
						alt="Style2Fit"
						className="h-9 w-auto object-contain"
					/>
					<div>
						
					</div>
				</div>
				<nav className="flex-1 px-3 space-y-1">
					{mainNav.map((n) => (
						<NavLink
							key={n.to}
							to={n.to}
							end={n.end}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
									isActive
										? "bg-sidebar-accent text-sidebar-primary font-semibold"
										: "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
								)
							}
						>
							<n.icon className="h-4 w-4" />
							{n.label}
						</NavLink>
					))}
				</nav>
				<div className="px-3 pb-3">
					{secondaryNav.map((n) => (
						<NavLink
							key={n.to}
							to={n.to}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1",
									isActive
										? "bg-sidebar-accent text-sidebar-primary font-semibold"
										: "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
								)
							}
						>
							<n.icon className="h-4 w-4" />
							{n.label}
						</NavLink>
					))}
					<Button
						variant="ghost"
						onClick={handleSignOut}
						className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground mt-1"
					>
						<LogOut className="h-4 w-4 mr-2" /> Sign out
					</Button>
				</div>
			</aside>

			{/* Mobile top bar – brand primary background, original logo colours untouched */}
			<header className="md:hidden sticky top-0 z-30 bg-primary shadow-sm">
				<div className="flex items-center justify-between px-4 h-14">
					<div className="flex items-center">
						<img
							src={logoUrl}
							alt="Style2Fit"
							className="h-9 w-auto object-contain"
						/>
					</div>
					<Button
						size="sm"
						variant="ghost"
						onClick={handleSignOut}
						aria-label="Sign out"
						className="text-primary-foreground hover:bg-primary-foreground/20"
					>
						<LogOut className="h-4 w-4" />
					</Button>
				</div>
			</header>

			<main className="px-4 md:px-8 py-6 md:py-10 max-w-6xl mx-auto">
				<Outlet />
			</main>

			{/* Mobile bottom nav */}
			<nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-pb">
				<ul className="grid grid-cols-6">
					{[...mainNav, ...secondaryNav].map((n) => (
						<li key={n.to}>
							<NavLink
								to={n.to}
								end={n.end}
								className={({ isActive }) =>
									cn(
										"flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
										isActive ? "text-primary" : "text-muted-foreground"
									)
								}
							>
								{({ isActive }) => (
									<>
										<n.icon
											className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
										/>
										{n.label}
									</>
								)}
							</NavLink>
						</li>
					))}
				</ul>
			</nav>
		</div>
	);
};
