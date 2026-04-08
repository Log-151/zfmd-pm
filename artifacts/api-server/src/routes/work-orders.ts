import { Router, type IRouter } from "express";
import { eq, and, gte, lte, like } from "drizzle-orm";
import { db, workOrdersTable, contractsTable } from "@workspace/db";
import {
  CreateWorkOrderBody,
  UpdateWorkOrderBody,
  GetWorkOrderParams,
  UpdateWorkOrderParams,
  DeleteWorkOrderParams,
  ListWorkOrdersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toWorkOrderResponse(wo: typeof workOrdersTable.$inferSelect) {
  return { ...wo };
}

router.get("/work-orders", async (req, res): Promise<void> => {
  const qp = ListWorkOrdersQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.year) conditions.push(like(workOrdersTable.applyDate, `${params.year}%`));
  if (params.startDate) conditions.push(gte(workOrdersTable.applyDate, params.startDate));
  if (params.endDate) conditions.push(lte(workOrdersTable.applyDate, params.endDate));
  if (params.province) conditions.push(eq(workOrdersTable.province, params.province));
  if (params.group) conditions.push(eq(workOrdersTable.group, params.group));
  if (params.station) conditions.push(eq(workOrdersTable.station, params.station));
  if (params.salesManager) conditions.push(eq(workOrdersTable.salesManager, params.salesManager));
  if (params.noContract === true) conditions.push(eq(workOrdersTable.hasContract, false));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const workOrders = await db.select().from(workOrdersTable).where(where).orderBy(workOrdersTable.applyDate);
  res.json(workOrders.map(toWorkOrderResponse));
});

router.post("/work-orders", async (req, res): Promise<void> => {
  const parsed = CreateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Auto-determine hasContract
  let hasContract = false;
  if (parsed.data.contractId) {
    const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, parsed.data.contractId));
    hasContract = !!contract;
  } else if (parsed.data.contractNo) {
    const [contract] = await db.select().from(contractsTable).where(like(contractsTable.contractNo, `%${parsed.data.contractNo}%`));
    hasContract = !!contract;
  }

  const [wo] = await db.insert(workOrdersTable).values({ ...parsed.data, hasContract, customFields: req.body.customFields ?? {} }).returning();
  res.status(201).json(toWorkOrderResponse(wo));
});

router.get("/work-orders/:id", async (req, res): Promise<void> => {
  const params = GetWorkOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [wo] = await db.select().from(workOrdersTable).where(eq(workOrdersTable.id, params.data.id));
  if (!wo) { res.status(404).json({ error: "Work order not found" }); return; }
  res.json(toWorkOrderResponse(wo));
});

router.patch("/work-orders/:id", async (req, res): Promise<void> => {
  const params = UpdateWorkOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const customFields = req.body.customFields;
  const [updated] = await db.update(workOrdersTable).set({ ...parsed.data, ...(customFields !== undefined && { customFields }), updatedAt: new Date() }).where(eq(workOrdersTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Work order not found" }); return; }
  res.json(toWorkOrderResponse(updated));
});

router.delete("/work-orders/:id", async (req, res): Promise<void> => {
  const params = DeleteWorkOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(workOrdersTable).where(eq(workOrdersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
