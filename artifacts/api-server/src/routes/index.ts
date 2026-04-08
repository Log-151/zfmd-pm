import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractsRouter from "./contracts";
import paymentsRouter from "./payments";
import invoicesRouter from "./invoices";
import workOrdersRouter from "./work-orders";
import weatherServicesRouter from "./weather-services";
import receivablesRouter from "./receivables";
import dashboardRouter from "./dashboard";
import customFieldDefsRouter from "./custom-field-defs";
import { statsRouter } from "./stats";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractsRouter);
router.use(paymentsRouter);
router.use(invoicesRouter);
router.use(workOrdersRouter);
router.use(weatherServicesRouter);
router.use(receivablesRouter);
router.use(dashboardRouter);
router.use(customFieldDefsRouter);
router.use(statsRouter);
router.use(backupRouter);

export default router;
