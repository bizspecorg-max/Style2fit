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
		staleTime: 1000 * 60 * 5, // 5 minutes fresh
		queryFn: async () => {
			const { data, error } = await supabase
				.from("subscriptions")
				.select("*")
				.eq("user_id", user!.id)
				.maybeSingle(); // use maybeSingle, not single, to avoid 404 error

			if (error) throw error;

			// If no subscription exists, create a default one in memory (without writing to DB)
			if (!data) {
				console.warn("No subscription found for user, using default trial");
				const defaultTrialEnd = new Date();
				defaultTrialEnd.setDate(defaultTrialEnd.getDate() + 7);
				return {
					id: "temp",
					user_id: user!.id,
					trial_start: new Date().toISOString().split("T")[0],
					trial_end: defaultTrialEnd.toISOString().split("T")[0],
					status: "trial",
					subscription_type: null,
					paid_until: null,
				} as Subscription;
			}

			return data as Subscription;
		},
	});
};
