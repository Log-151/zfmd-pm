import { pgTable, text, serial, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const receivablesTable = pgTable("receivables", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  customer: text("customer").notNull(),
  province: text("province").notNull(),
  station: text("station").notNull().default(""),
  salesManager: text("sales_manager").notNull(),
  receivableType: text("receivable_type").notNull().default("进度款"),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull().default("0"),
  expectedDate: text("expected_date"),
  deliveryDate: text("delivery_date"),
  acceptanceDate: text("acceptance_date"),
  invoiceDate: text("invoice_date"),
  actualPaymentDate: text("actual_payment_date"),
  daysLate: integer("days_late"),
  status: text("status").notNull().default("待收"),
  isBadDebt: boolean("is_bad_debt").notNull().default(false),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReceivableSchema = createInsertSchema(receivablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivablesTable.$inferSelect;
