import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
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
  salesManager: text("sales_manager").notNull(),
  paymentDate: text("payment_date").notNull(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull().default("0"),
  paymentRatio: numeric("payment_ratio", { precision: 10, scale: 4 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
