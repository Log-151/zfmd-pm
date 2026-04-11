import { Router, type IRouter } from "express";
import { eq, and, like } from "drizzle-orm";
import { db, weatherServicesTable } from "@workspace/db";
import {
  CreateWeatherServiceBody,
  UpdateWeatherServiceBody,
  GetWeatherServiceParams,
  UpdateWeatherServiceParams,
  DeleteWeatherServiceParams,
  ListWeatherServicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toWeatherServiceResponse(ws: typeof weatherServicesTable.$inferSelect) {
  return {
    ...ws,
    estimatedContractAmount: ws.estimatedContractAmount != null ? parseFloat(ws.estimatedContractAmount) : null,
  };
}

router.get("/weather-services", async (req, res): Promise<void> => {
  const qp = ListWeatherServicesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.province) conditions.push(eq(weatherServicesTable.province, params.province));
  if (params.group) conditions.push(eq(weatherServicesTable.group, params.group));
  if (params.station) conditions.push(like(weatherServicesTable.station, `%${params.station}%`));
  if (params.salesManager) conditions.push(eq(weatherServicesTable.contractSalesManager, params.salesManager));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const services = await db.select().from(weatherServicesTable).where(where).orderBy(weatherServicesTable.id);

  res.json(services.map(toWeatherServiceResponse));
});

router.post("/weather-services", async (req, res): Promise<void> => {
  const parsed = CreateWeatherServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [ws] = await db.insert(weatherServicesTable).values({
    ...parsed.data,
    estimatedContractAmount: parsed.data.estimatedContractAmount != null ? String(parsed.data.estimatedContractAmount) : null,
    customFields: req.body.customFields ?? {},
  }).returning();
  res.status(201).json(toWeatherServiceResponse(ws));
});

router.get("/weather-services/:id", async (req, res): Promise<void> => {
  const params = GetWeatherServiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [ws] = await db.select().from(weatherServicesTable).where(eq(weatherServicesTable.id, params.data.id));
  if (!ws) { res.status(404).json({ error: "Weather service not found" }); return; }
  res.json(toWeatherServiceResponse(ws));
});

router.patch("/weather-services/:id", async (req, res): Promise<void> => {
  const params = UpdateWeatherServiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWeatherServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.estimatedContractAmount != null) updateData.estimatedContractAmount = String(parsed.data.estimatedContractAmount);
  if (req.body.customFields !== undefined) updateData.customFields = req.body.customFields;
  const [updated] = await db.update(weatherServicesTable).set(updateData).where(eq(weatherServicesTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Weather service not found" }); return; }
  res.json(toWeatherServiceResponse(updated));
});

router.delete("/weather-services/:id", async (req, res): Promise<void> => {
  const params = DeleteWeatherServiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(weatherServicesTable).where(eq(weatherServicesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
