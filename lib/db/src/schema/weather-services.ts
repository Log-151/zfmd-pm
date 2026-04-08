import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weatherServicesTable = pgTable("weather_services", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  workOrderId: integer("work_order_id"),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull(),
  serviceStartDate: text("service_start_date"),
  serviceEndDate: text("service_end_date"),
  status: text("status").notNull().default("服务中"),
  stoppedDate: text("stopped_date"),
  overduedMonths: integer("overdued_months"),
  outageMonths: text("outage_months"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWeatherServiceSchema = createInsertSchema(weatherServicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeatherService = z.infer<typeof insertWeatherServiceSchema>;
export type WeatherService = typeof weatherServicesTable.$inferSelect;
