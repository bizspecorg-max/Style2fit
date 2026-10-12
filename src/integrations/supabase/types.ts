/**
 * Database types.
 *
 * Written by hand because this file previously contained the captured output
 * of an interrupted `npx supabase gen types` prompt — three lines of
 * "Ok to proceed? (y)" — which meant the project did not typecheck at all and
 * every query in the app was silently `any`.
 *
 * Regenerate properly whenever you have a Supabase access token:
 *
 *   npx supabase login
 *   npx supabase gen types typescript --project-id wapbalgjtrbtogsqefer \
 *     > src/integrations/supabase/types.ts
 *
 * Until then these columns were reconstructed from every .select(), .insert()
 * and .update() in src/, so they describe what the app actually uses. A column
 * that exists in Postgres but is never touched here will be missing; add it
 * when you need it.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** A field on a saved measurement: what it is called and what unit it was taken in. */
export interface MeasurementField {
	key: string;
	label: string;
	unit?: string;
}

export type OrderStatus = "pending" | "in_progress" | "ready" | "delivered";
export type PaymentStatus = "unpaid" | "part_payment" | "paid";

export interface Database {
	public: {
		Tables: {
			customers: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					phone: string | null;
					email: string | null;
					notes: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					phone?: string | null;
					email?: string | null;
					notes?: string | null;
					created_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
				Relationships: [];
			};
			measurements: {
				Row: {
					id: string;
					user_id: string;
					customer_id: string;
					title: string;
					fields: MeasurementField[];
					values: Record<string, string>;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					customer_id: string;
					title: string;
					fields: MeasurementField[];
					values: Record<string, string>;
					created_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["measurements"]["Insert"]>;
				Relationships: [];
			};
			orders: {
				Row: {
					id: string;
					user_id: string;
					customer_id: string;
					style_id: string | null;
					code: string | null;
					status: OrderStatus;
					payment_status: PaymentStatus;
					delivery_date: string | null;
					price: number | null;
					notes: string | null;
					/* Bare strings with no unit — see the unit note in lib/units.ts. */
					measurement_values: Record<string, string> | null;
					image_url: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					customer_id: string;
					style_id?: string | null;
					code?: string | null;
					status?: OrderStatus;
					payment_status?: PaymentStatus;
					delivery_date?: string | null;
					price?: number | null;
					notes?: string | null;
					measurement_values?: Record<string, string> | null;
					image_url?: string | null;
					created_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
				Relationships: [];
			};
			styles: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					category: string;
					image_url: string | null;
					/* {key,label} pairs, not strings — the first version of this
					   file said string[] and the compiler caught it immediately. */
					measurement_template: MeasurementField[] | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					category: string;
					image_url?: string | null;
					measurement_template?: MeasurementField[] | null;
					created_at?: string;
				};
				Update: Partial<Database["public"]["Tables"]["styles"]["Insert"]>;
				Relationships: [];
			};
			profiles: {
				Row: {
					id: string;
					business_name: string | null;
					full_name: string | null;
					phone: string | null;
				};
				Insert: {
					id: string;
					business_name?: string | null;
					full_name?: string | null;
					phone?: string | null;
				};
				Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
				Relationships: [];
			};
			subscriptions: {
				Row: {
					id: string;
					user_id: string;
					trial_start: string | null;
					trial_end: string | null;
					status: string;
					subscription_type: string | null;
					paid_until: string | null;
				};
				Insert: {
					id?: string;
					user_id: string;
					trial_start?: string | null;
					trial_end?: string | null;
					status?: string;
					subscription_type?: string | null;
					paid_until?: string | null;
				};
				Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			order_status: OrderStatus;
			payment_status: PaymentStatus;
		};
		CompositeTypes: Record<string, never>;
	};
}
