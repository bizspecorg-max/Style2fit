import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "@/components/CustomerFormDialog";

export type CustomerRow = Customer & {
	orders?: { count: number }[];
	measurements?: { count: number }[];
};

/** All customers with how many orders and measurements each has (counted by the database). */
export async function fetchCustomers() {
	const { data, error } = await supabase
		.from("customers")
		.select("id, name, phone, email, notes, created_at, orders(count), measurements(count)")
		.order("name");
	if (error) throw error;
	return (data ?? []) as unknown as CustomerRow[];
}
