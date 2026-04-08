import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workOrdersTable = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  workOrderNo: text("work_order_no").notNull(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  customer: text("customer").notNull(),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull().default(""),
  salesManager: text("sales_manager").notNull(),
  productType: text("product_type").notNull().default("数值天气预报"),
  applyDate: text("apply_date").notNull(),
  startDate: text("start_date"),
  notes: text("notes"),
  hasContract: boolean("has_contract").notNull().default(false),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrdersTable.$inferSelect;
