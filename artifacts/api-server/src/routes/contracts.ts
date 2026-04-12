import { Router, type IRouter } from "express";
import { eq, and, gte, lte, like, or, sql } from "drizzle-orm";
import { db, contractsTable, contractChangeLogsTable } from "@workspace/db";
import {
  CreateContractBody,
  UpdateContractBody,
  GetContractParams,
  UpdateContractParams,
  DeleteContractParams,
  GetContractChangeLogsParams,
  GetContractSummaryQueryParams,
  ListContractsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toContractResponse(c: typeof contractsTable.$inferSelect) {
  return {
    ...c,
    amountWithTax: parseFloat(c.amountWithTax),
    amountWithoutTax: parseFloat(c.amountWithoutTax),
    installFee: c.installFee ? parseFloat(c.installFee) : null,
    serviceFee: c.serviceFee ? parseFloat(c.serviceFee) : null,
    thirdPartyFee: c.thirdPartyFee ? parseFloat(c.thirdPartyFee) : null,
  };
}

router.get("/contracts/summary", async (req, res): Promise<void> => {
  const qp = GetContractSummaryQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.year) {
    conditions.push(like(contractsTable.signDate, `${params.year}%`));
  }
  if (params.startDate) {
    conditions.push(gte(contractsTable.signDate, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(contractsTable.signDate, params.endDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const contracts = await db.select().from(contractsTable).where(where);

  const totalWithTax = contracts.reduce((s, c) => s + parseFloat(c.amountWithTax), 0);
  const totalWithoutTax = contracts.reduce((s, c) => s + parseFloat(c.amountWithoutTax), 0);

  const byProvince: Record<string, { amount: number; count: number }> = {};
  const byManager: Record<string, { amount: number; count: number }> = {};
  const byProductType: Record<string, { amount: number; count: number }> = {};

  for (const c of contracts) {
    const amt = parseFloat(c.amountWithTax);
    if (!byProvince[c.province]) byProvince[c.province] = { amount: 0, count: 0 };
    byProvince[c.province].amount += amt;
    byProvince[c.province].count++;

    if (!byManager[c.salesManager]) byManager[c.salesManager] = { amount: 0, count: 0 };
    byManager[c.salesManager].amount += amt;
    byManager[c.salesManager].count++;

    if (!byProductType[c.productType]) byProductType[c.productType] = { amount: 0, count: 0 };
    byProductType[c.productType].amount += amt;
    byProductType[c.productType].count++;
  }

  res.json({
    totalWithTax,
    totalWithoutTax,
    count: contracts.length,
    byProvince: Object.entries(byProvince).map(([name, v]) => ({ name, ...v })),
    byManager: Object.entries(byManager).map(([name, v]) => ({ name, ...v })),
    byProductType: Object.entries(byProductType).map(([name, v]) => ({ name, ...v })),
  });
});

router.get("/contracts", async (req, res): Promise<void> => {
  const qp = ListContractsQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.year) conditions.push(like(contractsTable.signDate, `${params.year}%`));
  if (params.startDate) conditions.push(gte(contractsTable.signDate, params.startDate));
  if (params.endDate) conditions.push(lte(contractsTable.signDate, params.endDate));
  if (params.province) conditions.push(eq(contractsTable.province, params.province));
  if (params.group) conditions.push(eq(contractsTable.group, params.group));
  if (params.station) conditions.push(eq(contractsTable.station, params.station));
  if (params.salesManager) conditions.push(eq(contractsTable.salesManager, params.salesManager));
  if (params.contractType) conditions.push(eq(contractsTable.contractType, params.contractType));
  if (params.status) conditions.push(eq(contractsTable.status, params.status));
  if (params.search) {
    const s = `%${params.search}%`;
    conditions.push(
      or(
        like(contractsTable.contractNo, s),
        like(contractsTable.contractName, s),
        like(contractsTable.customer, s),
        like(contractsTable.station, s),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const contracts = await db.select().from(contractsTable).where(where).orderBy(contractsTable.signDate);
  res.json(contracts.map(toContractResponse));
});

router.post("/contracts", async (req, res): Promise<void> => {
  const { amountWithTax, amountWithoutTax, installFee, serviceFee } = req.body ?? {};
  console.log(`[CreateContract] amountWithTax=${JSON.stringify(amountWithTax)} (${typeof amountWithTax}), amountWithoutTax=${JSON.stringify(amountWithoutTax)}, installFee=${JSON.stringify(installFee)}, serviceFee=${JSON.stringify(serviceFee)}`);
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contract] = await db.insert(contractsTable).values({ ...parsed.data, customFields: req.body.customFields ?? {} }).returning();
  res.status(201).json(toContractResponse(contract));
});

router.get("/contracts/:id", async (req, res): Promise<void> => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, params.data.id));
  if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }
  res.json(toContractResponse(contract));
});

router.patch("/contracts/:id", async (req, res): Promise<void> => {
  const params = UpdateContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }

  // Track changes
  const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const [key, newVal] of Object.entries(parsed.data)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    if (oldVal !== newVal && newVal !== null && newVal !== undefined) {
      changes.push({ fieldName: key, oldValue: oldVal != null ? String(oldVal) : null, newValue: newVal != null ? String(newVal) : null });
    }
  }

  const customFields = req.body.customFields;
  const updateData = { ...parsed.data, ...(customFields !== undefined && { customFields }), updatedAt: new Date() };
  const [updated] = await db.update(contractsTable).set(updateData).where(eq(contractsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Contract not found" }); return; }

  if (changes.length > 0) {
    await db.insert(contractChangeLogsTable).values(changes.map(c => ({ contractId: params.data.id, ...c })));
  }

  res.json(toContractResponse(updated));
});

router.delete("/contracts/:id", async (req, res): Promise<void> => {
  const params = DeleteContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(contractsTable).where(eq(contractsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/contracts/:id/change-logs", async (req, res): Promise<void> => {
  const params = GetContractChangeLogsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const logs = await db.select().from(contractChangeLogsTable)
    .where(eq(contractChangeLogsTable.contractId, params.data.id))
    .orderBy(contractChangeLogsTable.changedAt);
  res.json(logs);
});

export default router;
