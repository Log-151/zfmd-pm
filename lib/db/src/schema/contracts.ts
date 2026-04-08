import { pgTable, text, serial, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: text("contract_no").notNull(),
  contractName: text("contract_name").notNull(),
  contractType: text("contract_type").notNull().default("销售合同"),
  status: text("status").notNull().default("执行中"),
  customer: text("customer").notNull(),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull().default(""),
  salesManager: text("sales_manager").notNull(),
  signDate: text("sign_date"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  amountWithTax: numeric("amount_with_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  amountWithoutTax: numeric("amount_without_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  productType: text("product_type").notNull().default("数值天气预报"),
  workOrderNo: text("work_order_no"),
  afterSaleNo: text("after_sale_no"),
  notes: text("notes"),
  isSpecial: boolean("is_special").notNull().default(false),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contractChangeLogsTable = pgTable("contract_change_logs", {
  id: serial("id").primaryKey(),
  contractId: serial("contract_id").notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  changedBy: text("changed_by"),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
export type ContractChangeLog = typeof contractChangeLogsTable.$inferSelect;
