import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customFieldDefsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/field-definitions", async (req, res): Promise<void> => {
  const module = req.query.module as string | undefined;
  const defs = module
    ? await db.select().from(customFieldDefsTable).where(eq(customFieldDefsTable.module, module)).orderBy(customFieldDefsTable.sortOrder)
    : await db.select().from(customFieldDefsTable).orderBy(customFieldDefsTable.sortOrder);
  res.json(defs);
});

router.post("/field-definitions", async (req, res): Promise<void> => {
  const { module, fieldName, fieldLabel, fieldType, options, isRequired, sortOrder } = req.body;
  if (!module || !fieldLabel) {
    res.status(400).json({ error: "module and fieldLabel are required" });
    return;
  }
  const name = fieldName || fieldLabel.replace(/\s+/g, "_").toLowerCase();
  const [def] = await db.insert(customFieldDefsTable).values({
    module,
    fieldName: name,
    fieldLabel,
    fieldType: fieldType ?? "text",
    options: options ?? null,
    isRequired: isRequired ?? false,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(def);
});

router.patch("/field-definitions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { fieldLabel, fieldType, options, isRequired, sortOrder } = req.body;
  const [updated] = await db.update(customFieldDefsTable).set({
    ...(fieldLabel !== undefined && { fieldLabel }),
    ...(fieldType !== undefined && { fieldType }),
    ...(options !== undefined && { options }),
    ...(isRequired !== undefined && { isRequired }),
    ...(sortOrder !== undefined && { sortOrder }),
  }).where(eq(customFieldDefsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/field-definitions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(customFieldDefsTable).where(eq(customFieldDefsTable.id, id));
  res.sendStatus(204);
});

export default router;
