import { Router, type IRouter } from "express";
import { eq, and, like } from "drizzle-orm";
import { db, receivablesTable } from "@workspace/db";
import {
  CreateReceivableBody,
  UpdateReceivableBody,
  GetReceivableParams,
  UpdateReceivableParams,
  DeleteReceivableParams,
  ListReceivablesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toReceivableResponse(r: typeof receivablesTable.$inferSelect) {
  return {
    ...r,
    amount: r.amount != null ? parseFloat(r.amount) : 0,
    contractAmount: r.contractAmount != null ? parseFloat(r.contractAmount) : null,
    committedAmount: r.committedAmount != null ? parseFloat(r.committedAmount) : null,
    actualAmount: r.actualAmount != null ? parseFloat(r.actualAmount) : null,
  };
}

router.get("/receivables", async (req, res): Promise<void> => {
  const qp = ListReceivablesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.contractNo) conditions.push(like(receivablesTable.contractNo, `%${params.contractNo}%`));
  if (params.province) conditions.push(eq(receivablesTable.province, params.province));
  if (params.salesManager) conditions.push(eq(receivablesTable.salesManager, params.salesManager));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const receivables = await db.select().from(receivablesTable).where(where).orderBy(receivablesTable.id);

  res.json(receivables.map(toReceivableResponse));
});

router.post("/receivables", async (req, res): Promise<void> => {
  const parsed = CreateReceivableBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.insert(receivablesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    contractAmount: parsed.data.contractAmount != null ? String(parsed.data.contractAmount) : null,
    committedAmount: parsed.data.committedAmount != null ? String(parsed.data.committedAmount) : null,
    actualAmount: parsed.data.actualAmount != null ? String(parsed.data.actualAmount) : null,
    customFields: req.body.customFields ?? {},
  }).returning();
  res.status(201).json(toReceivableResponse(r));
});

router.get("/receivables/:id", async (req, res): Promise<void> => {
  const params = GetReceivableParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [r] = await db.select().from(receivablesTable).where(eq(receivablesTable.id, params.data.id));
  if (!r) { res.status(404).json({ error: "Receivable not found" }); return; }
  res.json(toReceivableResponse(r));
});

router.patch("/receivables/:id", async (req, res): Promise<void> => {
  const params = UpdateReceivableParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateReceivableBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.amount != null) updateData.amount = String(parsed.data.amount);
  if (parsed.data.contractAmount != null) updateData.contractAmount = String(parsed.data.contractAmount);
  if (parsed.data.committedAmount != null) updateData.committedAmount = String(parsed.data.committedAmount);
  if (parsed.data.actualAmount != null) updateData.actualAmount = String(parsed.data.actualAmount);
  if (req.body.customFields !== undefined) updateData.customFields = req.body.customFields;

  const [updated] = await db.update(receivablesTable).set(updateData).where(eq(receivablesTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Receivable not found" }); return; }
  res.json(toReceivableResponse(updated));
});

router.delete("/receivables/:id", async (req, res): Promise<void> => {
  const params = DeleteReceivableParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(receivablesTable).where(eq(receivablesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
