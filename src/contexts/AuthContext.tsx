import {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SignUpData = {
	email: string;
	password: string;
	business_name: string;
	full_name: string;
	phone: string;
};

type Ctx = {
	user: User | null;
	session: Session | null;
	loading: boolean;
	signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
	signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
	signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
			setSession(s);
			setUser(s?.user ?? null);
		});
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		});
		return () => sub.subscription.unsubscribe();
	}, []);

	const signIn = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { error };
	};

	const signUp = async (d: SignUpData) => {
		// 1. Create the auth user
		const { data: authData, error } = await supabase.auth.signUp({
			email: d.email,
			password: d.password,
			options: {
				emailRedirectTo: `${window.location.origin}/`,
				data: {
					business_name: d.business_name,
					full_name: d.full_name,
					phone: d.phone,
				},
			},
		});

		if (error) return { error };

		// 2. If user is created, ensure the profile exists (fallback in case trigger didn't work)
		if (authData.user) {
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("id")
				.eq("id", authData.user.id)
				.maybeSingle();

			if (!profile && !profileError) {
				// Fallback insert – using `as any` because the generated types expect a `user_id` column which doesn't exist in the actual table
				await supabase.from("profiles").insert({
					id: authData.user.id,
					business_name: d.business_name,
					full_name: d.full_name,
					phone: d.phone,
				} as any);
			}
		}

		return { error: null };
	};

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	return (
		<AuthContext.Provider
			value={{ user, session, loading, signIn, signUp, signOut }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};
