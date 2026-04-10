import { pgTable, text, serial, timestamp, integer, boolean, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workOrdersTable = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  workOrderNo: text("work_order_no").notNull(),
  changeNo: text("change_no"),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  cancelTime: text("cancel_time"),
  costIncurred: text("cost_incurred"),
  costHandling: text("cost_handling"),
  circulationTime: text("circulation_time"),
  customer: text("customer").notNull().default(""),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull().default(""),
  stationType: text("station_type"),
  productType: text("product_type").notNull().default("风电功率预测"),
  projectContent: text("project_content"),
  salesManager: text("sales_manager").notNull(),
  briefingTime: text("briefing_time"),
  estimatedAmount: numeric("estimated_amount", { precision: 15, scale: 4 }),
  estimatedCost: numeric("estimated_cost", { precision: 15, scale: 4 }),
  actualAmount: numeric("actual_amount", { precision: 15, scale: 4 }),
  deliveryDept: text("delivery_dept"),
  projectManager: text("project_manager"),
  deliveryTime: text("delivery_time"),
  acceptanceTime: text("acceptance_time"),
  applyDate: text("apply_date").notNull().default(""),
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
