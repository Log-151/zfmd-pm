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

function getExpiryAlertLevel(serviceEndDate: string | null): string | null {
  if (!serviceEndDate) return null;
  const now = new Date();
  const end = new Date(serviceEndDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "1m";
  if (diffDays <= 60) return "2m";
  if (diffDays <= 90) return "3m";
  return null;
}

function getOverdueMonths(serviceEndDate: string | null): number | null {
  if (!serviceEndDate) return null;
  const now = new Date();
  const end = new Date(serviceEndDate);
  if (now <= end) return null;
  const diffMs = now.getTime() - end.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
}

function toWeatherServiceResponse(ws: typeof weatherServicesTable.$inferSelect) {
  return {
    ...ws,
    expiryAlertLevel: ws.status === "服务中" ? getExpiryAlertLevel(ws.serviceEndDate) : null,
    overduedMonths: ws.status === "服务中" ? getOverdueMonths(ws.serviceEndDate) : ws.overduedMonths,
  };
}

router.get("/weather-services/alerts", async (req, res): Promise<void> => {
  const services = await db.select().from(weatherServicesTable).where(eq(weatherServicesTable.status, "服务中"));

  const alerts = services
    .filter(ws => {
      const level = getExpiryAlertLevel(ws.serviceEndDate);
      return level !== null;
    })
    .map(ws => {
      const level = getExpiryAlertLevel(ws.serviceEndDate)!;
      const daysUntilExpiry = ws.serviceEndDate
        ? Math.floor((new Date(ws.serviceEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const overdueMonths = level === "expired" ? getOverdueMonths(ws.serviceEndDate) : null;
      return { service: toWeatherServiceResponse(ws), alertLevel: level, daysUntilExpiry, overdueMonths };
    })
    .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));

  res.json(alerts);
});

router.get("/weather-services", async (req, res): Promise<void> => {
  const qp = ListWeatherServicesQueryParams.safeParse(req.query);
  const params = qp.success ? qp.data : {};

  const conditions = [];
  if (params.province) conditions.push(eq(weatherServicesTable.province, params.province));
  if (params.group) conditions.push(eq(weatherServicesTable.group, params.group));
  if (params.station) conditions.push(like(weatherServicesTable.station, `%${params.station}%`));
  if (params.status) conditions.push(eq(weatherServicesTable.status, params.status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  let services = await db.select().from(weatherServicesTable).where(where).orderBy(weatherServicesTable.serviceEndDate);

  if (params.expiryAlert) {
    services = services.filter(ws => {
      const level = getExpiryAlertLevel(ws.serviceEndDate);
      return level === params.expiryAlert;
    });
  }

  res.json(services.map(toWeatherServiceResponse));
});

router.post("/weather-services", async (req, res): Promise<void> => {
  const parsed = CreateWeatherServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [ws] = await db.insert(weatherServicesTable).values({ ...parsed.data, customFields: req.body.customFields ?? {} }).returning();
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
  const customFields = req.body.customFields;
  const [updated] = await db.update(weatherServicesTable).set({ ...parsed.data, ...(customFields !== undefined && { customFields }), updatedAt: new Date() }).where(eq(weatherServicesTable.id, params.data.id)).returning();
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
