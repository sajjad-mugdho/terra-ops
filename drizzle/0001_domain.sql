CREATE TYPE "public"."order_status" AS ENUM('PLACED', 'ACCEPTED', 'REJECTED', 'ASSIGNED', 'LOADED', 'LIFTED_OFF', 'LANDED', 'AT_SECTOR', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PAID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."setting_field" AS ENUM('price', 'making_cost', 'delivery_charge', 'fuel_cost');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('PLANNING', 'LOADED', 'LIFTED_OFF', 'LANDED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"making_cost_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_unique" UNIQUE("name"),
	CONSTRAINT "products_price_range" CHECK ("products"."price_cents" between 0 and 100000000),
	CONSTRAINT "products_making_cost_range" CHECK ("products"."making_cost_cents" between 0 and 100000000)
);
--> statement-breakpoint
CREATE TABLE "settings_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"product_id" uuid,
	"planet_id" uuid,
	"field" "setting_field" NOT NULL,
	"old_value_cents" integer NOT NULL,
	"new_value_cents" integer NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_changes_one_target" CHECK (num_nonnulls("settings_changes"."product_id", "settings_changes"."planet_id") = 1),
	CONSTRAINT "settings_changes_field_matches_target" CHECK (("settings_changes"."product_id" is not null and "settings_changes"."field" in ('price', 'making_cost')) or ("settings_changes"."planet_id" is not null and "settings_changes"."field" in ('delivery_charge', 'fuel_cost'))),
	CONSTRAINT "settings_changes_values_range" CHECK ("settings_changes"."old_value_cents" between 0 and 100000000 and "settings_changes"."new_value_cents" between 0 and 100000000),
	CONSTRAINT "settings_changes_value_changed" CHECK ("settings_changes"."old_value_cents" <> "settings_changes"."new_value_cents")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector_id" uuid NOT NULL,
	"planet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_sector_name_unique" UNIQUE("sector_id","name"),
	CONSTRAINT "divisions_id_planet_unique" UNIQUE("id","planet_id")
);
--> statement-breakpoint
CREATE TABLE "planets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"days_from_earth" integer NOT NULL,
	"delivery_charge_cents" integer NOT NULL,
	"fuel_cost_cents" integer NOT NULL,
	"manager_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planets_name_unique" UNIQUE("name"),
	CONSTRAINT "planets_manager_id_unique" UNIQUE("manager_id"),
	CONSTRAINT "planets_days_from_earth_positive" CHECK ("planets"."days_from_earth" > 0),
	CONSTRAINT "planets_delivery_charge_range" CHECK ("planets"."delivery_charge_cents" between 0 and 100000000),
	CONSTRAINT "planets_fuel_cost_range" CHECK ("planets"."fuel_cost_cents" between 0 and 100000000)
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sectors_planet_name_unique" UNIQUE("planet_id","name"),
	CONSTRAINT "sectors_id_planet_unique" UNIQUE("id","planet_id")
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "order_events_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"actor_id" text NOT NULL,
	"trip_id" uuid,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "order_events_seq_unique" UNIQUE("seq")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"units" integer NOT NULL,
	"product_name" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"unit_making_cost_cents" integer NOT NULL,
	"unit_delivery_charge_cents" integer NOT NULL,
	CONSTRAINT "order_items_order_product_unique" UNIQUE("order_id","product_id"),
	CONSTRAINT "order_items_units_range" CHECK ("order_items"."units" between 1 and 20),
	CONSTRAINT "order_items_unit_price_range" CHECK ("order_items"."unit_price_cents" between 0 and 100000000),
	CONSTRAINT "order_items_unit_making_cost_range" CHECK ("order_items"."unit_making_cost_cents" between 0 and 100000000),
	CONSTRAINT "order_items_unit_delivery_charge_range" CHECK ("order_items"."unit_delivery_charge_cents" between 0 and 100000000)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"idempotency_key" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"planet_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"trip_id" uuid,
	"status" "order_status" DEFAULT 'PLACED' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PAID' NOT NULL,
	"total_units" integer NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_customer_idempotency_unique" UNIQUE("customer_id","idempotency_key"),
	CONSTRAINT "orders_total_units_range" CHECK ("orders"."total_units" between 1 and 20),
	CONSTRAINT "orders_rejected_is_refunded" CHECK (("orders"."status" = 'REJECTED') = ("orders"."payment_status" = 'REFUNDED')),
	CONSTRAINT "orders_reject_reason_matches_status" CHECK (("orders"."status" = 'REJECTED') = ("orders"."reject_reason" is not null)),
	CONSTRAINT "orders_trip_matches_status" CHECK (("orders"."trip_id" is null) = ("orders"."status" in ('PLACED', 'ACCEPTED', 'REJECTED'))),
	CONSTRAINT "orders_accepted_at_matches_status" CHECK (("orders"."accepted_at" is null) = ("orders"."status" in ('PLACED', 'REJECTED'))),
	CONSTRAINT "orders_delivered_at_matches_status" CHECK (("orders"."delivered_at" is not null) = ("orders"."status" = 'DELIVERED')),
	CONSTRAINT "orders_timestamps_in_order" CHECK ("orders"."accepted_at" >= "orders"."created_at" and "orders"."delivered_at" >= "orders"."accepted_at")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "trips_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 101 CACHE 1),
	"captain_id" text NOT NULL,
	"planet_id" uuid NOT NULL,
	"status" "trip_status" DEFAULT 'PLANNING' NOT NULL,
	"total_units" integer DEFAULT 0 NOT NULL,
	"fuel_cost_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"loaded_at" timestamp with time zone,
	"lifted_off_at" timestamp with time zone,
	"landed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "trips_number_unique" UNIQUE("number"),
	CONSTRAINT "trips_id_planet_unique" UNIQUE("id","planet_id"),
	CONSTRAINT "trips_total_units_range" CHECK ("trips"."total_units" between 0 and 20),
	CONSTRAINT "trips_fuel_cost_range" CHECK ("trips"."fuel_cost_cents" between 0 and 100000000),
	CONSTRAINT "trips_timestamps_in_order" CHECK ("trips"."loaded_at" >= "trips"."created_at" and "trips"."lifted_off_at" >= "trips"."loaded_at" and "trips"."landed_at" >= "trips"."lifted_off_at" and "trips"."completed_at" >= "trips"."landed_at" and "trips"."cancelled_at" >= "trips"."created_at"),
	CONSTRAINT "trips_not_empty_after_planning" CHECK ("trips"."status" in ('PLANNING', 'CANCELLED') or "trips"."total_units" >= 1),
	CONSTRAINT "trips_cancelled_is_empty" CHECK ("trips"."status" <> 'CANCELLED' or "trips"."total_units" = 0),
	CONSTRAINT "trips_loaded_at_matches_status" CHECK (("trips"."loaded_at" is not null) = ("trips"."status" in ('LOADED', 'LIFTED_OFF', 'LANDED', 'COMPLETED'))),
	CONSTRAINT "trips_lifted_off_at_matches_status" CHECK (("trips"."lifted_off_at" is not null) = ("trips"."status" in ('LIFTED_OFF', 'LANDED', 'COMPLETED'))),
	CONSTRAINT "trips_landed_at_matches_status" CHECK (("trips"."landed_at" is not null) = ("trips"."status" in ('LANDED', 'COMPLETED'))),
	CONSTRAINT "trips_completed_at_matches_status" CHECK (("trips"."completed_at" is not null) = ("trips"."status" = 'COMPLETED')),
	CONSTRAINT "trips_cancelled_at_matches_status" CHECK (("trips"."cancelled_at" is not null) = ("trips"."status" = 'CANCELLED'))
);
--> statement-breakpoint
ALTER TABLE "settings_changes" ADD CONSTRAINT "settings_changes_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_changes" ADD CONSTRAINT "settings_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_changes" ADD CONSTRAINT "settings_changes_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_sector_planet_fk" FOREIGN KEY ("sector_id","planet_id") REFERENCES "public"."sectors"("id","planet_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_division_planet_fk" FOREIGN KEY ("division_id","planet_id") REFERENCES "public"."divisions"("id","planet_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_trip_planet_fk" FOREIGN KEY ("trip_id","planet_id") REFERENCES "public"."trips"("id","planet_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_captain_id_user_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settings_changes_changed_at_idx" ON "settings_changes" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "settings_changes_product_idx" ON "settings_changes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "settings_changes_planet_idx" ON "settings_changes" USING btree ("planet_id");--> statement-breakpoint
CREATE INDEX "order_events_order_seq_idx" ON "order_events" USING btree ("order_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "order_events_once_per_status" ON "order_events" USING btree ("order_id","status") WHERE "order_events"."status" not in ('ACCEPTED', 'ASSIGNED');--> statement-breakpoint
CREATE INDEX "order_events_trip_idx" ON "order_events" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_customer_created_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_planet_status_idx" ON "orders" USING btree ("planet_id","status");--> statement-breakpoint
CREATE INDEX "orders_trip_idx" ON "orders" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "orders_delivered_at_idx" ON "orders" USING btree ("delivered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_one_open_per_captain" ON "trips" USING btree ("captain_id") WHERE "trips"."status" not in ('COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE INDEX "trips_captain_status_idx" ON "trips" USING btree ("captain_id","status");--> statement-breakpoint
CREATE INDEX "trips_planet_status_idx" ON "trips" USING btree ("planet_id","status");--> statement-breakpoint
CREATE INDEX "trips_completed_at_idx" ON "trips" USING btree ("completed_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_valid" CHECK ("user"."role" in ('admiral', 'manager', 'captain', 'customer'));