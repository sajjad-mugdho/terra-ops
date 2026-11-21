import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatus = pgEnum("order_status", [
  "PLACED",
  "ACCEPTED",
  "REJECTED",
  "ASSIGNED",
  "LOADED",
  "LIFTED_OFF",
  "LANDED",
  "AT_SECTOR",
  "DELIVERED",
]);

export const paymentStatus = pgEnum("payment_status", ["PAID", "REFUNDED"]);

export const tripStatus = pgEnum("trip_status", [
  "PLANNING",
  "LOADED",
  "LIFTED_OFF",
  "LANDED",
  "COMPLETED",
  "CANCELLED",
]);

export const settingField = pgEnum("setting_field", [
  "price",
  "making_cost",
  "delivery_charge",
  "fuel_cost",
]);
