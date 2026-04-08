import { pgTable, text, serial, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  invoiceNo: text("invoice_no"),
  customer: text("customer").notNull(),
  province: text("province").notNull(),
  station: text("station").notNull().default(""),
  salesManager: text("sales_manager").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  amountWithTax: numeric("amount_with_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  amountWithoutTax: numeric("amount_without_tax", { precision: 20, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 4 }).notNull().default("0.09"),
  expectedPaymentDate: text("expected_payment_date"),
  expectedPaymentAmount: numeric("expected_payment_amount", { precision: 20, scale: 2 }),
  actualPaymentDate: text("actual_payment_date"),
  actualPaymentAmount: numeric("actual_payment_amount", { precision: 20, scale: 2 }),
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
