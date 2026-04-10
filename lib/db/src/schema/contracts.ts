import { pgTable, text, serial, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: text("contract_no").notNull(),
  changeNo: text("change_no"),
  workOrderNo: text("work_order_no"),
  afterSaleNo: text("after_sale_no"),
  contractName: text("contract_name").notNull(),
  contractType: text("contract_type").notNull().default("销售合同"),
  status: text("status").notNull().default("执行中"),
  customer: text("customer").notNull(),
  company1: text("company1"),
  company2: text("company2"),
  company3: text("company3"),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull().default(""),
  otherName: text("other_name"),
  stationType: text("station_type"),
  stationCapacity: text("station_capacity"),
  productType: text("product_type").notNull().default("风电功率预测"),
  projectContent: text("project_content"),
  projectNo: text("project_no"),
  salesManager: text("sales_manager").notNull(),
  salesContact: text("sales_contact"),
  archiveDate: text("archive_date"),
  signDate: text("sign_date"),
  archiveType: text("archive_type"),
  archiveCopies: text("archive_copies"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  installFee: numeric("install_fee", { precision: 20, scale: 4 }),
  serviceFee: numeric("service_fee", { precision: 20, scale: 4 }),
  amountWithTax: numeric("amount_with_tax", { precision: 20, scale: 4 }).notNull().default("0"),
  amountWithoutTax: numeric("amount_without_tax", { precision: 20, scale: 4 }).notNull().default("0"),
  excludeRevenue: boolean("exclude_revenue").notNull().default(false),
  excludePerformance: boolean("exclude_performance").notNull().default(false),
  guaranteeLetter: text("guarantee_letter"),
  deliveryDept: text("delivery_dept"),
  projectManager: text("project_manager"),
  briefingDate: text("briefing_date"),
  thirdPartyFee: numeric("third_party_fee", { precision: 20, scale: 4 }),
  isSpecial: boolean("is_special").notNull().default(false),
  notes: text("notes"),
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
