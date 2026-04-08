import { Router, type IRouter } from "express";
import { eq, and, like, gte, lte } from "drizzle-orm";
import { db, receivablesTable } from "@workspace/db";
import {
  CreateReceivableBody,
  UpdateReceivableBody,
  GetReceivableParams,
  UpdateReceivableParams,
  DeleteReceivableParams,
  ListReceivablesQueryParams,
  GetReceivableAlertsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toReceivableResponse(r: typeof receivablesTable.$inferSelect) {
  const amount = parseFloat(r.amount);
  let daysLate = r.daysLate;

  if (r.actualPaymentDate && r.expectedDate) {
    const actual = new Date(r.actualPaymentDate);
    const expected = new Date(r.expectedDate);
    daysLate = Math.max(0, Math.floor((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return { ...r, amount, daysLate };
}

router.get("/receivables/alerts", async (req, res): Promise<void> => {
  const qp = GetReceivableAlertsQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const now = new Date();
  const receivables = await db.select().from(receivablesTable);

  const alerts = [];
  for (const r of receivables) {
    const resp = toReceivableResponse(r);
    const alertTypes: string[] = [];

    // Overdue: expected date passed but no payment
    if (r.expectedDate && !r.actualPaymentDate && r.status !== "已回款") {
      if (new Date(r.expectedDate) < now) {
        alertTypes.push("overdue");
      }
    }

    // Invoiced but no delivery
    if (r.invoiceDate && !r.deliveryDate && r.receivableType !== "质保款") {
      alertTypes.push("no_delivery");
    }

    // Invoiced but no acceptance
    if (r.invoiceDate && r.deliveryDate && !r.acceptanceDate) {
      alertTypes.push("no_acceptance");
    }

    // Payment received but no receivable date recorded
    if (r.actualPaymentDate && !r.expectedDate) {
      alertTypes.push("missing_receivable_date");
    }

    for (const alertType of alertTypes) {
      const daysLate = r.expectedDate && !r.actualPaymentDate
        ? Math.floor((now.getTime() - new Date(r.expectedDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      alerts.push({ receivable: resp, alertType, daysLate });
    }
  }

  res.json(alerts);
});

router.get("/receivables", async (req, res): Promise<void> => {
  const qp = ListReceivablesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.contractId) conditions.push(eq(receivablesTable.contractId, params.contractId));
  if (params.contractNo) conditions.push(like(receivablesTable.contractNo, `%${params.contractNo}%`));
  if (params.province) conditions.push(eq(receivablesTable.province, params.province));
  if (params.salesManager) conditions.push(eq(receivablesTable.salesManager, params.salesManager));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  let receivables = await db.select().from(receivablesTable).where(where).orderBy(receivablesTable.expectedDate);

  const now = new Date();
  if (params.overdueOnly) {
    receivables = receivables.filter(r =>
      r.expectedDate && !r.actualPaymentDate && new Date(r.expectedDate) < now
    );
  }
  if (params.uninvoiced) {
    receivables = receivables.filter(r => !r.invoiceDate);
  }
  if (params.undelivered) {
    receivables = receivables.filter(r => !r.deliveryDate);
  }

  res.json(receivables.map(toReceivableResponse));
});

router.post("/receivables", async (req, res): Promise<void> => {
  const parsed = CreateReceivableBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.insert(receivablesTable).values({ ...parsed.data, amount: String(parsed.data.amount) }).returning();
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

  // Auto-compute days late if both dates present
  if (parsed.data.actualPaymentDate) {
    const [existing] = await db.select().from(receivablesTable).where(eq(receivablesTable.id, params.data.id));
    const expectedDate = parsed.data.expectedDate ?? existing?.expectedDate;
    if (expectedDate) {
      const daysLate = Math.max(0, Math.floor(
        (new Date(parsed.data.actualPaymentDate).getTime() - new Date(expectedDate).getTime()) / (1000 * 60 * 60 * 24)
      ));
      updateData.daysLate = daysLate;
      updateData.status = "已回款";
    }
  }

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
