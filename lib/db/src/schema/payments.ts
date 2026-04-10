import { pgTable, text, serial, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id"),
  contractNo: text("contract_no"),
  payer: text("payer").notNull(),
  province: text("province").notNull(),
  group: text("group").notNull().default(""),
  station: text("station").notNull().default(""),
  productLine: text("product_line").default(""),
  projectContent: text("project_content").default(""),
  salesManager: text("sales_manager").notNull(),
  salesContact: text("sales_contact").default(""),
  paymentDate: text("payment_date").notNull(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull().default("0"),
  billAmount: numeric("bill_amount", { precision: 20, scale: 2 }).default("0"),
  cashAmount: numeric("cash_amount", { precision: 20, scale: 2 }).default("0"),
  paymentRatio: numeric("payment_ratio", { precision: 10, scale: 4 }),
  paymentType: text("payment_type").default(""),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
