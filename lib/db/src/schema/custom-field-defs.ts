import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customFieldDefsTable = pgTable("custom_field_defs", {
  id: serial("id").primaryKey(),
  module: text("module").notNull(),
  fieldName: text("field_name").notNull(),
  fieldLabel: text("field_label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  options: text("options"),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldDefSchema = createInsertSchema(customFieldDefsTable).omit({ id: true, createdAt: true });
export type InsertCustomFieldDef = z.infer<typeof insertCustomFieldDefSchema>;
export type CustomFieldDef = typeof customFieldDefsTable.$inferSelect;
