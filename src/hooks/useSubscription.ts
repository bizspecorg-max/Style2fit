import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Subscription = {
	id: string;
	user_id: string;
	trial_start: string;
	trial_end: string;
	status: "trial" | "active" | "expired";
	subscription_type: string | null;
	paid_until: string | null;
};

export const useSubscription = () => {
	const { user } = useAuth();
	return useQuery({
		queryKey: ["subscription", user?.id],
		enabled: !!user,
		queryFn: async () => {
			// Use type assertion to bypass TypeScript until table is added to types
			const { data, error } = await (supabase as any)
				.from("subscriptions")
				.select("*")
				.eq("user_id", user!.id)
				.single();
			if (error) throw error;
			return data as Subscription;
		},
	});
};
