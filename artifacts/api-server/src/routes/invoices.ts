import { Router, type IRouter } from "express";
import { eq, and, gte, lte, like } from "drizzle-orm";
import { db, invoicesTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  UpdateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  DeleteInvoiceParams,
  ListInvoicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeOutstanding(inv: typeof invoicesTable.$inferSelect): number {
  const invoiced = parseFloat(inv.amountWithTax);
  const received = inv.actualPaymentAmount ? parseFloat(inv.actualPaymentAmount) : 0;
  return Math.max(0, invoiced - received);
}

function isOverdue(inv: typeof invoicesTable.$inferSelect): boolean {
  if (inv.status === "作废" || inv.voidDate) return false;
  if (!inv.expectedPaymentDate) return false;
  const outstanding = computeOutstanding(inv);
  if (outstanding <= 0) return false;
  return new Date(inv.expectedPaymentDate) < new Date();
}

function toInvoiceResponse(inv: typeof invoicesTable.$inferSelect) {
  return {
    ...inv,
    amountWithTax: parseFloat(inv.amountWithTax),
    amountWithoutTax: parseFloat(inv.amountWithoutTax),
    taxRate: parseFloat(inv.taxRate),
    expectedPaymentAmount: inv.expectedPaymentAmount ? parseFloat(inv.expectedPaymentAmount) : null,
    actualPaymentAmount: inv.actualPaymentAmount ? parseFloat(inv.actualPaymentAmount) : null,
    outstandingAmount: computeOutstanding(inv),
    isOverdue: isOverdue(inv),
  };
}

router.get("/invoices/alerts", async (req, res): Promise<void> => {
  const invoices = await db.select().from(invoicesTable);
  const alerts = invoices
    .filter(inv => isOverdue(inv))
    .map(inv => {
      const daysPastDue = inv.expectedPaymentDate
        ? Math.floor((Date.now() - new Date(inv.expectedPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        invoice: toInvoiceResponse(inv),
        daysPastDue,
        outstandingAmount: computeOutstanding(inv),
      };
    })
    .sort((a, b) => b.daysPastDue - a.daysPastDue);
  res.json(alerts);
});

router.get("/invoices", async (req, res): Promise<void> => {
  const qp = ListInvoicesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.contractId) conditions.push(eq(invoicesTable.contractId, params.contractId));
  if (params.contractNo) conditions.push(like(invoicesTable.contractNo, `%${params.contractNo}%`));
  if (params.year) conditions.push(like(invoicesTable.invoiceDate, `${params.year}%`));
  if (params.month) {
    const mo = String(params.month).padStart(2, "0");
    if (params.year) conditions.push(like(invoicesTable.invoiceDate, `${params.year}-${mo}%`));
  }
  if (params.startDate) conditions.push(gte(invoicesTable.invoiceDate, params.startDate));
  if (params.endDate) conditions.push(lte(invoicesTable.invoiceDate, params.endDate));
  if (params.province) conditions.push(eq(invoicesTable.province, params.province));
  if (params.salesManager) conditions.push(eq(invoicesTable.salesManager, params.salesManager));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  let invoices = await db.select().from(invoicesTable).where(where).orderBy(invoicesTable.invoiceDate);

  if (params.overdueOnly) {
    invoices = invoices.filter(inv => isOverdue(inv));
  }

  res.json(invoices.map(toInvoiceResponse));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [inv] = await db.insert(invoicesTable).values({
    ...parsed.data,
    amountWithTax: String(parsed.data.amountWithTax),
    amountWithoutTax: String(parsed.data.amountWithoutTax),
    taxRate: String(parsed.data.taxRate),
    expectedPaymentAmount: parsed.data.expectedPaymentAmount != null ? String(parsed.data.expectedPaymentAmount) : undefined,
  }).returning();
  res.status(201).json(toInvoiceResponse(inv));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(toInvoiceResponse(inv));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.amountWithTax != null) updateData.amountWithTax = String(parsed.data.amountWithTax);
  if (parsed.data.amountWithoutTax != null) updateData.amountWithoutTax = String(parsed.data.amountWithoutTax);
  if (parsed.data.taxRate != null) updateData.taxRate = String(parsed.data.taxRate);
  if (parsed.data.expectedPaymentAmount != null) updateData.expectedPaymentAmount = String(parsed.data.expectedPaymentAmount);
  if (parsed.data.actualPaymentAmount != null) updateData.actualPaymentAmount = String(parsed.data.actualPaymentAmount);

  const [updated] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(toInvoiceResponse(updated));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
