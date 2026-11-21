-- Rules a CHECK cannot express. Applied as a custom migration after the tables exist.

CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: this data is history', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation', CONSTRAINT = TG_NAME;
END $$;
--> statement-breakpoint
CREATE TRIGGER order_events_append_only BEFORE UPDATE OR DELETE ON order_events
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER settings_changes_append_only BEFORE UPDATE OR DELETE ON settings_changes
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER order_items_append_only BEFORE UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER orders_no_delete BEFORE DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER orders_frozen_columns BEFORE UPDATE ON orders
  FOR EACH ROW WHEN (
    (OLD.customer_id, OLD.planet_id, OLD.division_id, OLD.total_units, OLD.idempotency_key, OLD.created_at)
    IS DISTINCT FROM
    (NEW.customer_id, NEW.planet_id, NEW.division_id, NEW.total_units, NEW.idempotency_key, NEW.created_at)
  ) EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER trips_no_delete BEFORE DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER trips_frozen_columns BEFORE UPDATE ON trips
  FOR EACH ROW WHEN (
    (OLD.captain_id, OLD.planet_id, OLD.fuel_cost_cents, OLD.created_at)
    IS DISTINCT FROM
    (NEW.captain_id, NEW.planet_id, NEW.fuel_cost_cents, NEW.created_at)
  ) EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER trips_units_frozen_after_planning BEFORE UPDATE ON trips
  FOR EACH ROW WHEN (OLD.status <> 'PLANNING' AND OLD.total_units IS DISTINCT FROM NEW.total_units)
  EXECUTE FUNCTION forbid_change();
--> statement-breakpoint

-- At commit: the unit counter equals the orders, order statuses fit the trip, a finished trip is COMPLETED.
CREATE FUNCTION check_trip(p_trip_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t trips%ROWTYPE;
  units integer;
BEGIN
  SELECT * INTO t FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(sum(total_units), 0) INTO units FROM orders WHERE trip_id = p_trip_id;
  IF units <> t.total_units THEN
    RAISE EXCEPTION 'trip % says % units but its orders hold %', t.number, t.total_units, units
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_total_units_matches_orders';
  END IF;

  IF EXISTS (
    SELECT 1 FROM orders o WHERE o.trip_id = p_trip_id AND NOT CASE t.status
      WHEN 'PLANNING' THEN o.status = 'ASSIGNED'
      WHEN 'LOADED' THEN o.status = 'LOADED'
      WHEN 'LIFTED_OFF' THEN o.status = 'LIFTED_OFF'
      WHEN 'LANDED' THEN o.status IN ('LANDED', 'AT_SECTOR', 'DELIVERED')
      WHEN 'COMPLETED' THEN o.status = 'DELIVERED'
      ELSE false
    END
  ) THEN
    RAISE EXCEPTION 'trip % is % but holds an order in a status that does not fit', t.number, t.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_order_status_matches_trip';
  END IF;

  IF t.status = 'LANDED' AND NOT EXISTS (
    SELECT 1 FROM orders WHERE trip_id = p_trip_id AND status <> 'DELIVERED'
  ) THEN
    RAISE EXCEPTION 'trip % has every order delivered but is not COMPLETED', t.number
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_all_delivered_is_completed';
  END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION orders_check_trip() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.trip_id IS NOT NULL THEN
    PERFORM check_trip(OLD.trip_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.trip_id IS NOT NULL THEN
    PERFORM check_trip(NEW.trip_id);
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE FUNCTION trips_check_trip() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM check_trip(NEW.id);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER orders_trip_consistent
  AFTER INSERT OR DELETE OR UPDATE OF trip_id, total_units, status ON orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders_check_trip();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trips_consistent
  AFTER INSERT OR UPDATE OF total_units, status ON trips
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION trips_check_trip();
