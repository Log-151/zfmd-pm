import { Router, type IRouter } from "express";
import { eq, and, gte, lte, like, sql } from "drizzle-orm";
import { db, paymentsTable, contractsTable } from "@workspace/db";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  DeletePaymentParams,
  ListPaymentsQueryParams,
  GetPaymentSummaryQueryParams,
  GetPayerContractsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toPaymentResponse(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: parseFloat(p.amount),
    paymentRatio: p.paymentRatio ? parseFloat(p.paymentRatio) : null,
  };
}

router.get("/payments/summary", async (req, res): Promise<void> => {
  const qp = GetPaymentSummaryQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.year) conditions.push(like(paymentsTable.paymentDate, `${params.year}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const payments = await db.select().from(paymentsTable).where(where);

  const total = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

  const byYear: Record<number, { amount: number; count: number }> = {};
  const byQuarter: Record<string, { year: number; quarter: number; amount: number; count: number }> = {};
  const byManager: Record<string, { amount: number; count: number }> = {};
  const byProvince: Record<string, { amount: number; count: number }> = {};

  for (const p of payments) {
    const amt = parseFloat(p.amount);
    const yr = parseInt(p.paymentDate.slice(0, 4), 10);
    const mo = parseInt(p.paymentDate.slice(5, 7), 10);
    const q = Math.ceil(mo / 3);

    if (!byYear[yr]) byYear[yr] = { amount: 0, count: 0 };
    byYear[yr].amount += amt;
    byYear[yr].count++;

    const qk = `${yr}-Q${q}`;
    if (!byQuarter[qk]) byQuarter[qk] = { year: yr, quarter: q, amount: 0, count: 0 };
    byQuarter[qk].amount += amt;
    byQuarter[qk].count++;

    if (!byManager[p.salesManager]) byManager[p.salesManager] = { amount: 0, count: 0 };
    byManager[p.salesManager].amount += amt;
    byManager[p.salesManager].count++;

    if (!byProvince[p.province]) byProvince[p.province] = { amount: 0, count: 0 };
    byProvince[p.province].amount += amt;
    byProvince[p.province].count++;
  }

  res.json({
    totalAmount: total,
    count: payments.length,
    byYear: Object.entries(byYear).map(([year, v]) => ({ year: parseInt(year, 10), ...v })).sort((a, b) => a.year - b.year),
    byQuarter: Object.values(byQuarter).sort((a, b) => a.year - b.year || a.quarter - b.quarter),
    byManager: Object.entries(byManager).map(([name, v]) => ({ name, ...v })),
    byProvince: Object.entries(byProvince).map(([name, v]) => ({ name, ...v })),
  });
});

router.get("/payments/payer-contracts", async (req, res): Promise<void> => {
  const qp = GetPayerContractsQueryParams.safeParse(req.query);
  if (!qp.success) { res.status(400).json({ error: qp.error.message }); return; }

  const payer = qp.data.payer;
  const payerPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.payer, payer));
  const contractIds = [...new Set(payerPayments.map(p => p.contractId).filter(Boolean))];

  if (contractIds.length === 0) {
    // Also search by customer name match
    const contracts = await db.select().from(contractsTable).where(like(contractsTable.customer, `%${payer}%`));
    res.json(contracts.map(c => ({ ...c, amountWithTax: parseFloat(c.amountWithTax), amountWithoutTax: parseFloat(c.amountWithoutTax) })));
    return;
  }

  const contracts = await db.select().from(contractsTable);
  const filtered = contracts.filter(c => contractIds.includes(c.id));
  res.json(filtered.map(c => ({ ...c, amountWithTax: parseFloat(c.amountWithTax), amountWithoutTax: parseFloat(c.amountWithoutTax) })));
});

router.get("/payments", async (req, res): Promise<void> => {
  const qp = ListPaymentsQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.contractId) conditions.push(eq(paymentsTable.contractId, params.contractId));
  if (params.contractNo) conditions.push(like(paymentsTable.contractNo, `%${params.contractNo}%`));
  if (params.year) conditions.push(like(paymentsTable.paymentDate, `${params.year}%`));
  if (params.month) {
    const mo = String(params.month).padStart(2, "0");
    if (params.year) {
      conditions.push(like(paymentsTable.paymentDate, `${params.year}-${mo}%`));
    }
  }
  if (params.startDate) conditions.push(gte(paymentsTable.paymentDate, params.startDate));
  if (params.endDate) conditions.push(lte(paymentsTable.paymentDate, params.endDate));
  if (params.payer) conditions.push(like(paymentsTable.payer, `%${params.payer}%`));
  if (params.province) conditions.push(eq(paymentsTable.province, params.province));
  if (params.salesManager) conditions.push(eq(paymentsTable.salesManager, params.salesManager));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const payments = await db.select().from(paymentsTable).where(where).orderBy(paymentsTable.paymentDate);
  res.json(payments.map(toPaymentResponse));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Auto-calculate payment ratio if contract is linked
  let paymentRatio: string | undefined;
  if (parsed.data.contractId) {
    const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, parsed.data.contractId));
    if (contract && parseFloat(contract.amountWithTax) > 0) {
      paymentRatio = (parsed.data.amount / parseFloat(contract.amountWithTax)).toFixed(4);
    }
  }

  const [payment] = await db.insert(paymentsTable).values({ ...parsed.data, amount: String(parsed.data.amount), paymentRatio }).returning();
  res.status(201).json(toPaymentResponse(payment));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(toPaymentResponse(payment));
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(paymentsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(toPaymentResponse(updated));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
