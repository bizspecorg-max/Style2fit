import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MeasurementField } from "@/lib/measurementTemplates";

export type StyleRow = {
	id: string;
	name: string;
	category: string;
	image_url: string | null;
	measurement_template: MeasurementField[] | null;
	created_at: string;
};

export async function fetchStyles() {
	const { data, error } = await supabase.from("styles").select("id, name, category, image_url, measurement_template, created_at").order("name");
	if (error) throw error;
	return (data ?? []) as unknown as StyleRow[];
}

/** The shop's styles — shared by the Styles page and the new-order flow (one cache). */
export function useStyles() {
	const { user } = useAuth();
	return useQuery({ queryKey: ["styles", user?.id], enabled: !!user, queryFn: fetchStyles });
}
