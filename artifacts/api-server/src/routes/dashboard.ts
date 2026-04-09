import { Router, type IRouter } from "express";
import { eq, like } from "drizzle-orm";
import { db, contractsTable, paymentsTable, invoicesTable, workOrdersTable, weatherServicesTable, receivablesTable } from "@workspace/db";
import { GetMonthlyStatsQueryParams, GetProjectManagementQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function getExpiryAlertLevel(serviceEndDate: string | null): string | null {
  if (!serviceEndDate) return null;
  const now = new Date();
  const end = new Date(serviceEndDate);
  const diffDays = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 90) return "3m";
  return null;
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [contracts, payments, invoices, workOrders, weatherServices, receivables] = await Promise.all([
    db.select().from(contractsTable),
    db.select().from(paymentsTable),
    db.select().from(invoicesTable),
    db.select().from(workOrdersTable),
    db.select().from(weatherServicesTable),
    db.select().from(receivablesTable),
  ]);

  const now = new Date();
  const currentYear = now.getFullYear();

  const totalContractValue = contracts.reduce((s, c) => s + parseFloat(c.amountWithTax), 0);
  const currentYearContractValue = contracts
    .filter(c => c.signDate?.startsWith(String(currentYear)))
    .reduce((s, c) => s + parseFloat(c.amountWithTax), 0);

  const totalPaymentsReceived = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const currentYearPayments = payments
    .filter(p => p.paymentDate.startsWith(String(currentYear)))
    .reduce((s, p) => s + parseFloat(p.amount), 0);

  const totalInvoiced = invoices
    .filter(i => i.status !== "作废")
    .reduce((s, i) => s + parseFloat(i.amountWithTax), 0);

  const totalOutstanding = invoices
    .filter(i => i.status !== "作废")
    .reduce((s, i) => {
      const outstanding = Math.max(0, parseFloat(i.amountWithTax) - (i.actualPaymentAmount ? parseFloat(i.actualPaymentAmount) : 0));
      return s + outstanding;
    }, 0);

  const overdueCount = invoices.filter(i => {
    if (i.status === "作废" || !i.expectedPaymentDate) return false;
    const outstanding = Math.max(0, parseFloat(i.amountWithTax) - (i.actualPaymentAmount ? parseFloat(i.actualPaymentAmount) : 0));
    return outstanding > 0 && new Date(i.expectedPaymentDate) < now;
  }).length;

  const weatherServicesExpiringSoon = weatherServices.filter(ws => {
    if (ws.status !== "服务中") return false;
    return getExpiryAlertLevel(ws.serviceEndDate) !== null;
  }).length;

  const workOrdersWithoutContract = workOrders.filter(wo => !wo.hasContract).length;

  // After-sale alerts: contracts with afterSaleNo but no payment received
  const afterSaleAlertsCount = contracts.filter(c => {
    if (!c.afterSaleNo) return false;
    const contractPayments = payments.filter(p => p.contractId === c.id);
    return contractPayments.length === 0;
  }).length;

  const recentAlerts: { type: string; message: string; severity: string; relatedId?: number }[] = [];

  // Add weather expiry alerts
  weatherServices
    .filter(ws => ws.status === "服务中" && getExpiryAlertLevel(ws.serviceEndDate) === "expired")
    .slice(0, 3)
    .forEach(ws => recentAlerts.push({ type: "weather_expiry", message: `场站 ${ws.station} 预报服务已超期`, severity: "high", relatedId: ws.id }));

  // Add overdue invoice alerts
  invoices
    .filter(i => {
      if (i.status === "作废" || !i.expectedPaymentDate) return false;
      const outstanding = Math.max(0, parseFloat(i.amountWithTax) - (i.actualPaymentAmount ? parseFloat(i.actualPaymentAmount) : 0));
      return outstanding > 0 && new Date(i.expectedPaymentDate) < now;
    })
    .slice(0, 3)
    .forEach(i => recentAlerts.push({ type: "overdue_invoice", message: `发票 ${i.invoiceNo ?? i.id} 已逾期未回款`, severity: "high", relatedId: i.id }));

  // Work orders without contract
  workOrders
    .filter(wo => !wo.hasContract)
    .slice(0, 2)
    .forEach(wo => recentAlerts.push({ type: "no_contract", message: `开工 ${wo.workOrderNo} 无对应合同`, severity: "medium", relatedId: wo.id }));

  res.json({
    totalContractValue,
    totalPaymentsReceived,
    totalOutstanding,
    totalInvoiced,
    overdueCount,
    weatherServicesExpiringSoon,
    workOrdersWithoutContract,
    afterSaleAlertsCount,
    currentYearContractValue,
    currentYearPayments,
    recentAlerts,
  });
});

router.get("/dashboard/aging", async (_req, res): Promise<void> => {
  const now = new Date();
  const invoices = await db.select().from(invoicesTable);

  // 账龄 = 发票开出日期 至今天的天数，统计各账龄区间的未收款金额
  // buckets: current=0-30天, days30=31-60天, days60=61-90天, days90=91-180天, over90=180天以上
  const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };

  for (const inv of invoices) {
    if (inv.status === "作废") continue;
    const outstanding = Math.max(0, parseFloat(inv.amountWithTax) - (inv.actualPaymentAmount ? parseFloat(inv.actualPaymentAmount) : 0));
    if (outstanding <= 0) continue;

    aging.total += outstanding;

    const baseDate = inv.invoiceDate || inv.expectedPaymentDate;
    if (!baseDate) {
      aging.current += outstanding;
      continue;
    }

    const daysOld = Math.floor((now.getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld <= 30) aging.current += outstanding;
    else if (daysOld <= 60) aging.days30 += outstanding;
    else if (daysOld <= 90) aging.days60 += outstanding;
    else if (daysOld <= 180) aging.days90 += outstanding;
    else aging.over90 += outstanding;
  }

  res.json(aging);
});

router.get("/dashboard/monthly-stats", async (req, res): Promise<void> => {
  const qp = GetMonthlyStatsQueryParams.safeParse(req.query);
  const year = qp.success && qp.data.year ? qp.data.year : new Date().getFullYear();

  const [payments, invoices, receivables] = await Promise.all([
    db.select().from(paymentsTable).where(like(paymentsTable.paymentDate, `${year}%`)),
    db.select().from(invoicesTable).where(like(invoicesTable.invoiceDate, `${year}%`)),
    db.select().from(receivablesTable),
  ]);

  const stats: { [month: number]: { payments: number; invoiced: number; receivables: number } } = {};
  for (let m = 1; m <= 12; m++) stats[m] = { payments: 0, invoiced: 0, receivables: 0 };

  for (const p of payments) {
    const month = parseInt(p.paymentDate.slice(5, 7), 10);
    stats[month].payments += parseFloat(p.amount);
  }
  for (const i of invoices) {
    if (i.status === "作废") continue;
    const month = parseInt(i.invoiceDate.slice(5, 7), 10);
    stats[month].invoiced += parseFloat(i.amountWithTax);
  }
  for (const r of receivables) {
    if (r.expectedDate?.startsWith(String(year))) {
      const month = parseInt(r.expectedDate.slice(5, 7), 10);
      stats[month].receivables += parseFloat(r.amount);
    }
  }

  res.json(Object.entries(stats).map(([m, v]) => ({ year, month: parseInt(m, 10), ...v })));
});

router.get("/dashboard/project-management", async (req, res): Promise<void> => {
  const [invoices, payments, receivables, workOrders, contracts] = await Promise.all([
    db.select().from(invoicesTable),
    db.select().from(paymentsTable),
    db.select().from(receivablesTable),
    db.select().from(workOrdersTable),
    db.select().from(contractsTable),
  ]);

  const now = new Date();

  // Total payments by contract
  const paymentsByContract: Record<number, number> = {};
  for (const p of payments) {
    if (p.contractId) {
      paymentsByContract[p.contractId] = (paymentsByContract[p.contractId] ?? 0) + parseFloat(p.amount);
    }
  }

  // Invoice amounts by contract
  const invoicedByContract: Record<number, number> = {};
  for (const i of invoices) {
    if (i.contractId && i.status !== "作废") {
      invoicedByContract[i.contractId] = (invoicedByContract[i.contractId] ?? 0) + parseFloat(i.amountWithTax);
    }
  }

  let invoicedExpiredWarranty = 0;
  let invoicedProgressReceivable = 0;
  let uninvoicedProgressReceivable = 0;
  let invoicedUnexpiredWarranty = 0;
  let invoicedUnexpiredReceivable = 0;
  let uninvoicedUnexpiredReceivable = 0;
  let totalInvoicedReceivable = 0;
  let invoicedBadDebt = 0;
  let totalBadDebt = 0;

  for (const r of receivables) {
    const amount = parseFloat(r.amount);
    const hasInvoice = !!r.invoiceDate;
    const isWarranty = r.receivableType === "质保款";
    const isExpired = r.expectedDate ? new Date(r.expectedDate) < now : false;
    const isBadDebt = r.isBadDebt;

    if (isBadDebt) {
      totalBadDebt += amount;
      if (hasInvoice) invoicedBadDebt += amount;
    }

    if (hasInvoice) {
      totalInvoicedReceivable += amount;
      if (isWarranty) {
        if (isExpired) invoicedExpiredWarranty += amount;
        else invoicedUnexpiredWarranty += amount;
      } else {
        if (isExpired) invoicedProgressReceivable += amount;
        else invoicedUnexpiredReceivable += amount;
      }
    } else {
      if (isExpired) uninvoicedProgressReceivable += amount;
      else uninvoicedUnexpiredReceivable += amount;
    }
  }

  // Fully/partially/un-invoiced actual receivables
  let fullyInvoicedActualReceivable = 0;
  let partiallyInvoicedActualReceivable = 0;
  let uninvoicedActualReceivable = 0;

  for (const c of contracts) {
    const contractAmount = parseFloat(c.amountWithTax);
    const invoiced = invoicedByContract[c.id] ?? 0;
    const contractReceivables = receivables.filter(r => r.contractId === c.id);
    const totalReceivable = contractReceivables.reduce((s, r) => s + parseFloat(r.amount), 0);

    if (invoiced >= contractAmount && invoiced > 0) {
      fullyInvoicedActualReceivable += totalReceivable;
    } else if (invoiced > 0) {
      partiallyInvoicedActualReceivable += totalReceivable;
    } else {
      uninvoicedActualReceivable += totalReceivable;
    }
  }

  // Work orders without contracts
  const noContractWorkOrders = workOrders.filter(wo => !wo.hasContract);
  const noContractExpectedReceivable = noContractWorkOrders.length * 500000; // Estimated

  // Contracts without weather service
  const noServiceContractExpected = contracts
    .filter(c => c.productType === "数值天气预报")
    .length * 100000; // Estimated

  res.json({
    invoicedExpiredWarranty,
    invoicedProgressReceivable,
    uninvoicedProgressReceivable,
    invoicedUnexpiredWarranty,
    invoicedUnexpiredReceivable,
    uninvoicedUnexpiredReceivable,
    fullyInvoicedActualReceivable,
    partiallyInvoicedActualReceivable,
    uninvoicedActualReceivable,
    noContractExpectedReceivable,
    noServiceContractExpected,
    totalInvoicedReceivable,
    invoicedBadDebt,
    netInvoicedReceivable: totalInvoicedReceivable - invoicedBadDebt,
    totalBadDebt,
  });
});

export default router;
