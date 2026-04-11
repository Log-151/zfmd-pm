import { pgTable, text, serial, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const receivablesTable = pgTable("receivables", {
  id: serial("id").primaryKey(),
  salesManager: text("sales_manager").notNull().default(""),
  salesContact: text("sales_contact").default(""),
  province: text("province").notNull().default(""),
  group: text("group").default(""),
  station: text("station").default(""),
  contractNo: text("contract_no").default(""),
  productLine: text("product_line").default(""),
  projectContent: text("project_content").default(""),
  contractAmount: numeric("contract_amount", { precision: 20, scale: 4 }),
  receivableName: text("receivable_name").default(""),
  amount: numeric("amount", { precision: 20, scale: 4 }).notNull().default("0"),
  receivableDate: text("receivable_date").default(""),
  pendingDate: text("pending_date").default(""),
  committedPeriodDate: text("committed_period_date").default(""),
  committedPaymentDate: text("committed_payment_date").default(""),
  committedAmount: numeric("committed_amount", { precision: 20, scale: 4 }),
  actualPaymentDate: text("actual_payment_date").default(""),
  actualAmount: numeric("actual_amount", { precision: 20, scale: 4 }),
  overdueMonths: text("overdue_months").default(""),
  actualInvoiceDate: text("actual_invoice_date").default(""),
  actualDeliveryDate: text("actual_delivery_date").default(""),
  actualAcceptanceDate: text("actual_acceptance_date").default(""),
  paymentTerms: text("payment_terms").default(""),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReceivableSchema = createInsertSchema(receivablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivablesTable.$inferSelect;
