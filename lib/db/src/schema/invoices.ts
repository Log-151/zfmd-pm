import { pgTable, text, serial, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  invoiceNo: text("invoice_no"),
  customer: text("customer").notNull(),
  province: text("province").notNull(),
  group: text("group"),
  station: text("station").notNull().default(""),
  productLine: text("product_line"),
  projectContent: text("project_content"),
  salesManager: text("sales_manager").notNull(),
  salesContact: text("sales_contact"),
  contractAmount: numeric("contract_amount", { precision: 20, scale: 2 }),
  applicationDate: text("application_date"),
  invoiceDate: text("invoice_date").notNull(),
  amountWithTax: numeric("amount_with_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  amountWithoutTax: numeric("amount_without_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  taxRate: text("tax_rate").notNull().default("税率6%"),
  expectedPaymentDate: text("expected_payment_date"),
  expectedPaymentAmount: numeric("expected_payment_amount", { precision: 20, scale: 2 }),
  actualPaymentDate: text("actual_payment_date"),
  actualPaymentAmount: numeric("actual_payment_amount", { precision: 20, scale: 2 }),
  courierNo: text("courier_no"),
  voidDate: text("void_date"),
  status: text("status").notNull().default("有效"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
