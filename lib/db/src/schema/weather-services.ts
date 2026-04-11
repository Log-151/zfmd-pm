import { pgTable, text, serial, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weatherServicesTable = pgTable("weather_services", {
  id: serial("id").primaryKey(),
  contractSalesManager: text("contract_sales_manager").notNull().default(""),
  salesManager: text("sales_manager").default(""),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull(),
  stationType: text("station_type").default(""),
  forecastStartDate: text("forecast_start_date").default(""),
  officialForecastDate: text("official_forecast_date").default(""),
  serviceEndDate: text("service_end_date").default(""),
  overdueMonths: text("overdue_months").default(""),
  isOverdue: text("is_overdue").default(""),
  estimatedContractAmount: numeric("estimated_contract_amount", { precision: 15, scale: 4 }),
  estimatedContractDate: text("estimated_contract_date").default(""),
  renewalNotes: text("renewal_notes").default(""),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWeatherServiceSchema = createInsertSchema(weatherServicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeatherService = z.infer<typeof insertWeatherServiceSchema>;
export type WeatherService = typeof weatherServicesTable.$inferSelect;
