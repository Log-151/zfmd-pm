import { Router, type IRouter } from "express";
import { sql, and, gte, lte, isNotNull, like } from "drizzle-orm";
import {
  db,
  paymentsTable,
  contractsTable,
  invoicesTable,
  receivablesTable,
  weatherServicesTable,
  workOrdersTable,
} from "@workspace/db";

const router: IRouter = Router();

function dateConditions(table: any, col: any, startDate?: string, endDate?: string, year?: number) {
  const conds = [];
  if (year) conds.push(like(col, `${year}%`));
  if (startDate) conds.push(gte(col, startDate));
  if (endDate) conds.push(lte(col, endDate));
  return conds;
}

/* ─── 回款统计 ────────────────────────────────────── */
router.get("/stats/payments", async (req, res): Promise<void> => {
  const { groupBy = "year", year, startDate, endDate, province, salesManager, payer } = req.query as Record<string, string>;

  let groupExpr: string;
  let labelExpr: string;

  if (groupBy === "year") {
    groupExpr = "EXTRACT(YEAR FROM payment_date::date)";
    labelExpr = "EXTRACT(YEAR FROM payment_date::date)::text";
  } else if (groupBy === "quarter") {
    groupExpr = "EXTRACT(YEAR FROM payment_date::date), EXTRACT(QUARTER FROM payment_date::date)";
    labelExpr = "EXTRACT(YEAR FROM payment_date::date)::text || '-Q' || EXTRACT(QUARTER FROM payment_date::date)::text";
  } else if (groupBy === "month") {
    groupExpr = "DATE_TRUNC('month', payment_date::date)";
    labelExpr = "TO_CHAR(payment_date::date, 'YYYY-MM')";
  } else if (groupBy === "manager") {
    groupExpr = "sales_manager";
    labelExpr = "sales_manager";
  } else if (groupBy === "province") {
    groupExpr = "province";
    labelExpr = "province";
  } else if (groupBy === "payer") {
    groupExpr = "payer";
    labelExpr = "payer";
  } else if (groupBy === "contract") {
    groupExpr = "contract_no";
    labelExpr = "COALESCE(contract_no, '无合同')";
  } else {
    groupExpr = "EXTRACT(YEAR FROM payment_date::date)";
    labelExpr = "EXTRACT(YEAR FROM payment_date::date)::text";
  }

  const whereParts: string[] = ["payment_date IS NOT NULL"];
  if (year) whereParts.push(`payment_date LIKE '${year}%'`);
  if (startDate) whereParts.push(`payment_date >= '${startDate}'`);
  if (endDate) whereParts.push(`payment_date <= '${endDate}'`);
  if (province) whereParts.push(`province = '${province.replace(/'/g, "''")}'`);
  if (salesManager) whereParts.push(`sales_manager = '${salesManager.replace(/'/g, "''")}'`);
  if (payer) whereParts.push(`payer LIKE '%${payer.replace(/'/g, "''")}%'`);

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      ${labelExpr} AS label,
      COUNT(*) AS count,
      SUM(amount::numeric) AS total,
      AVG(amount::numeric) AS avg_amount,
      MAX(amount::numeric) AS max_amount
    FROM payments
    ${where}
    GROUP BY ${groupExpr}
    ORDER BY ${groupExpr}
  `));

  res.json(rows.rows.map(r => ({
    label: String(r.label ?? ""),
    count: Number(r.count),
    total: parseFloat(String(r.total ?? "0")),
    avgAmount: parseFloat(String(r.avg_amount ?? "0")),
    maxAmount: parseFloat(String(r.max_amount ?? "0")),
  })));
});

/* ─── 合同统计 ────────────────────────────────────── */
router.get("/stats/contracts", async (req, res): Promise<void> => {
  const { groupBy = "year", startDate, endDate, province, salesManager, contractType } = req.query as Record<string, string>;

  let groupExpr: string;
  let labelExpr: string;

  if (groupBy === "year") {
    groupExpr = "EXTRACT(YEAR FROM sign_date::date)";
    labelExpr = "EXTRACT(YEAR FROM sign_date::date)::text";
  } else if (groupBy === "quarter") {
    groupExpr = "EXTRACT(YEAR FROM sign_date::date), EXTRACT(QUARTER FROM sign_date::date)";
    labelExpr = "EXTRACT(YEAR FROM sign_date::date)::text || '-Q' || EXTRACT(QUARTER FROM sign_date::date)::text";
  } else if (groupBy === "month") {
    groupExpr = "DATE_TRUNC('month', sign_date::date)";
    labelExpr = "TO_CHAR(sign_date::date, 'YYYY-MM')";
  } else if (groupBy === "province") {
    groupExpr = "province";
    labelExpr = "province";
  } else if (groupBy === "manager") {
    groupExpr = "sales_manager";
    labelExpr = "sales_manager";
  } else if (groupBy === "type") {
    groupExpr = "contract_type";
    labelExpr = "contract_type";
  } else if (groupBy === "product") {
    groupExpr = "product_type";
    labelExpr = "product_type";
  } else if (groupBy === "status") {
    groupExpr = "status";
    labelExpr = "status";
  } else {
    groupExpr = "EXTRACT(YEAR FROM sign_date::date)";
    labelExpr = "EXTRACT(YEAR FROM sign_date::date)::text";
  }

  const whereParts: string[] = ["sign_date IS NOT NULL"];
  if (startDate) whereParts.push(`sign_date >= '${startDate}'`);
  if (endDate) whereParts.push(`sign_date <= '${endDate}'`);
  if (province) whereParts.push(`province = '${province.replace(/'/g, "''")}'`);
  if (salesManager) whereParts.push(`sales_manager = '${salesManager.replace(/'/g, "''")}'`);
  if (contractType) whereParts.push(`contract_type = '${contractType.replace(/'/g, "''")}'`);

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      ${labelExpr} AS label,
      COUNT(*) AS count,
      SUM(amount_with_tax::numeric) AS total_with_tax,
      SUM(amount_without_tax::numeric) AS total_without_tax,
      AVG(amount_with_tax::numeric) AS avg_with_tax
    FROM contracts
    ${where}
    GROUP BY ${groupExpr}
    ORDER BY ${groupExpr}
  `));

  res.json(rows.rows.map(r => ({
    label: String(r.label ?? ""),
    count: Number(r.count),
    totalWithTax: parseFloat(String(r.total_with_tax ?? "0")),
    totalWithoutTax: parseFloat(String(r.total_without_tax ?? "0")),
    avgWithTax: parseFloat(String(r.avg_with_tax ?? "0")),
  })));
});

/* ─── 开票统计 ────────────────────────────────────── */
router.get("/stats/invoices", async (req, res): Promise<void> => {
  const { groupBy = "month", startDate, endDate, year, province, salesManager } = req.query as Record<string, string>;

  let groupExpr: string;
  let labelExpr: string;

  if (groupBy === "year") {
    groupExpr = "EXTRACT(YEAR FROM invoice_date::date)";
    labelExpr = "EXTRACT(YEAR FROM invoice_date::date)::text";
  } else if (groupBy === "month") {
    groupExpr = "DATE_TRUNC('month', invoice_date::date)";
    labelExpr = "TO_CHAR(invoice_date::date, 'YYYY-MM')";
  } else if (groupBy === "quarter") {
    groupExpr = "EXTRACT(YEAR FROM invoice_date::date), EXTRACT(QUARTER FROM invoice_date::date)";
    labelExpr = "EXTRACT(YEAR FROM invoice_date::date)::text || '-Q' || EXTRACT(QUARTER FROM invoice_date::date)::text";
  } else if (groupBy === "province") {
    groupExpr = "province";
    labelExpr = "province";
  } else if (groupBy === "manager") {
    groupExpr = "sales_manager";
    labelExpr = "sales_manager";
  } else if (groupBy === "status") {
    groupExpr = "status";
    labelExpr = "status";
  } else {
    groupExpr = "DATE_TRUNC('month', invoice_date::date)";
    labelExpr = "TO_CHAR(invoice_date::date, 'YYYY-MM')";
  }

  const whereParts: string[] = ["invoice_date IS NOT NULL"];
  if (year) whereParts.push(`invoice_date LIKE '${year}%'`);
  if (startDate) whereParts.push(`invoice_date >= '${startDate}'`);
  if (endDate) whereParts.push(`invoice_date <= '${endDate}'`);
  if (province) whereParts.push(`province = '${province.replace(/'/g, "''")}'`);
  if (salesManager) whereParts.push(`sales_manager = '${salesManager.replace(/'/g, "''")}'`);

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      ${labelExpr} AS label,
      COUNT(*) AS count,
      SUM(amount_with_tax::numeric) AS total_with_tax,
      SUM(amount_without_tax::numeric) AS total_without_tax,
      SUM(
        COALESCE(amount_with_tax::numeric, 0)
        - COALESCE(actual_payment_amount::numeric, 0)
      ) AS total_outstanding
    FROM invoices
    ${where}
    GROUP BY ${groupExpr}
    ORDER BY ${groupExpr}
  `));

  res.json(rows.rows.map(r => ({
    label: String(r.label ?? ""),
    count: Number(r.count),
    totalWithTax: parseFloat(String(r.total_with_tax ?? "0")),
    totalWithoutTax: parseFloat(String(r.total_without_tax ?? "0")),
    totalOutstanding: parseFloat(String(r.total_outstanding ?? "0")),
  })));
});

/* ─── 应收款统计 ────────────────────────────────────── */
router.get("/stats/receivables", async (req, res): Promise<void> => {
  const { groupBy = "status", province, salesManager, receivableType, year } = req.query as Record<string, string>;

  let groupExpr: string;
  let labelExpr: string;

  if (groupBy === "status") {
    groupExpr = "status";
    labelExpr = "status";
  } else if (groupBy === "province") {
    groupExpr = "province";
    labelExpr = "province";
  } else if (groupBy === "manager") {
    groupExpr = "sales_manager";
    labelExpr = "sales_manager";
  } else if (groupBy === "type") {
    groupExpr = "receivable_type";
    labelExpr = "receivable_type";
  } else if (groupBy === "month") {
    groupExpr = "DATE_TRUNC('month', expected_date::date)";
    labelExpr = "TO_CHAR(expected_date::date, 'YYYY-MM')";
  } else if (groupBy === "aging") {
    groupExpr = `CASE
      WHEN days_late IS NULL OR days_late <= 0 THEN '未到期'
      WHEN days_late <= 30 THEN '1-30天'
      WHEN days_late <= 60 THEN '31-60天'
      WHEN days_late <= 90 THEN '61-90天'
      ELSE '90天以上'
    END`;
    labelExpr = groupExpr;
  } else {
    groupExpr = "status";
    labelExpr = "status";
  }

  const whereParts: string[] = [];
  if (year) whereParts.push(`expected_date LIKE '${year}%'`);
  if (province) whereParts.push(`province = '${province.replace(/'/g, "''")}'`);
  if (salesManager) whereParts.push(`sales_manager = '${salesManager.replace(/'/g, "''")}'`);
  if (receivableType) whereParts.push(`receivable_type = '${receivableType.replace(/'/g, "''")}'`);
  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      ${labelExpr} AS label,
      COUNT(*) AS count,
      SUM(amount::numeric) AS total,
      SUM(CASE WHEN status != '已回款' THEN amount::numeric ELSE 0 END) AS pending,
      SUM(CASE WHEN is_bad_debt THEN amount::numeric ELSE 0 END) AS bad_debt
    FROM receivables
    ${where}
    GROUP BY ${groupExpr}
    ORDER BY ${groupExpr}
  `));

  res.json(rows.rows.map(r => ({
    label: String(r.label ?? ""),
    count: Number(r.count),
    total: parseFloat(String(r.total ?? "0")),
    pending: parseFloat(String(r.pending ?? "0")),
    badDebt: parseFloat(String(r.bad_debt ?? "0")),
  })));
});

/* ─── 数值天气到期统计 ────────────────────────────── */
router.get("/stats/weather", async (req, res): Promise<void> => {
  const { groupBy = "alert", province } = req.query as Record<string, string>;

  let groupExpr: string;
  let labelExpr: string;

  if (groupBy === "province") {
    groupExpr = "province";
    labelExpr = "province";
  } else if (groupBy === "alert") {
    groupExpr = `CASE
      WHEN service_end_date IS NULL THEN '无截止日期'
      WHEN service_end_date::date < CURRENT_DATE THEN '已过期'
      WHEN service_end_date::date < CURRENT_DATE + INTERVAL '1 month' THEN '1个月内'
      WHEN service_end_date::date < CURRENT_DATE + INTERVAL '2 months' THEN '2个月内'
      WHEN service_end_date::date < CURRENT_DATE + INTERVAL '3 months' THEN '3个月内'
      ELSE '正常'
    END`;
    labelExpr = groupExpr;
  } else if (groupBy === "status") {
    groupExpr = "status";
    labelExpr = "status";
  } else {
    groupExpr = "province";
    labelExpr = "province";
  }

  const whereParts: string[] = [];
  if (province) whereParts.push(`province = '${province.replace(/'/g, "''")}'`);
  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      ${labelExpr} AS label,
      COUNT(*) AS count,
      COUNT(CASE WHEN status = '服务中' THEN 1 END) AS active_count,
      MIN(service_end_date) AS earliest_expiry,
      MAX(service_end_date) AS latest_expiry
    FROM weather_services
    ${where}
    GROUP BY ${groupExpr}
  `));

  res.json(rows.rows.map(r => ({
    label: String(r.label ?? ""),
    count: Number(r.count),
    activeCount: Number(r.active_count),
    earliestExpiry: r.earliest_expiry,
    latestExpiry: r.latest_expiry,
  })));
});

/* ─── 合同回款详情 ────────────────────────────────── */
router.get("/stats/contract-payments", async (req, res): Promise<void> => {
  const { contractNo } = req.query as { contractNo?: string };

  if (!contractNo) {
    res.status(400).json({ error: "contractNo is required" });
    return;
  }

  const [contract] = await db.execute(sql.raw(`
    SELECT contract_no, contract_name, customer, amount_with_tax, amount_without_tax, status
    FROM contracts WHERE contract_no = '${contractNo.replace(/'/g, "''")}'
    LIMIT 1
  `));

  const paymentsRows = await db.execute(sql.raw(`
    SELECT payment_date, amount::numeric, payer, notes
    FROM payments WHERE contract_no = '${contractNo.replace(/'/g, "''")}'
    ORDER BY payment_date ASC
  `));

  const contractRow = (contract as any).rows?.[0] ?? (contract as any);
  const payments = (paymentsRows as any).rows ?? paymentsRows;

  const totalPaid = payments.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);
  const contractAmount = parseFloat(String(contractRow?.amount_with_tax ?? "0"));

  res.json({
    contract: contractRow ? {
      contractNo: contractRow.contract_no,
      contractName: contractRow.contract_name,
      customer: contractRow.customer,
      amountWithTax: contractAmount,
      amountWithoutTax: parseFloat(String(contractRow.amount_without_tax ?? "0")),
      status: contractRow.status,
    } : null,
    payments: payments.map((p: any) => ({
      paymentDate: p.payment_date,
      amount: parseFloat(p.amount || "0"),
      payer: p.payer,
      notes: p.notes,
    })),
    totalPaid,
    remaining: contractAmount - totalPaid,
    paymentRatio: contractAmount > 0 ? totalPaid / contractAmount : 0,
  });
});

/* ─── 综合月度报表 ────────────────────────────────── */
router.get("/stats/monthly-report", async (req, res): Promise<void> => {
  const { year, salesManager } = req.query as Record<string, string>;
  const currentYear = year || new Date().getFullYear().toString();

  const managerWhere = salesManager ? `AND sales_manager = '${salesManager.replace(/'/g, "''")}' ` : "";

  const months = await db.execute(sql.raw(`
    WITH months AS (
      SELECT generate_series(1, 12) AS m
    )
    SELECT
      m.m AS month,
      COALESCE(p.total_payments, 0) AS total_payments,
      COALESCE(p.payment_count, 0) AS payment_count,
      COALESCE(i.total_invoiced, 0) AS total_invoiced,
      COALESCE(i.invoice_count, 0) AS invoice_count,
      COALESCE(r.total_receivable, 0) AS total_receivable,
      COALESCE(r.overdue_receivable, 0) AS overdue_receivable,
      COALESCE(c.total_contracts, 0) AS total_contracts,
      COALESCE(c.contract_count, 0) AS contract_count
    FROM months m
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM payment_date::date)::int AS month,
             SUM(amount::numeric) AS total_payments,
             COUNT(*) AS payment_count
      FROM payments
      WHERE payment_date LIKE '${currentYear}%' ${managerWhere}
      GROUP BY month
    ) p ON p.month = m.m
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM invoice_date::date)::int AS month,
             SUM(amount_with_tax::numeric) AS total_invoiced,
             COUNT(*) AS invoice_count
      FROM invoices
      WHERE invoice_date LIKE '${currentYear}%' ${managerWhere}
      GROUP BY month
    ) i ON i.month = m.m
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM expected_date::date)::int AS month,
             SUM(amount::numeric) AS total_receivable,
             SUM(CASE WHEN status != '已回款' AND days_late > 0 THEN amount::numeric ELSE 0 END) AS overdue_receivable
      FROM receivables
      WHERE expected_date LIKE '${currentYear}%' ${managerWhere}
      GROUP BY month
    ) r ON r.month = m.m
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM sign_date::date)::int AS month,
             SUM(amount_with_tax::numeric) AS total_contracts,
             COUNT(*) AS contract_count
      FROM contracts
      WHERE sign_date LIKE '${currentYear}%' ${managerWhere}
      GROUP BY month
    ) c ON c.month = m.m
    ORDER BY m.m
  `));

  const MONTH_NAMES = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  res.json((months as any).rows.map((r: any) => ({
    month: MONTH_NAMES[Number(r.month) - 1],
    monthNum: Number(r.month),
    totalPayments: parseFloat(r.total_payments),
    paymentCount: Number(r.payment_count),
    totalInvoiced: parseFloat(r.total_invoiced),
    invoiceCount: Number(r.invoice_count),
    totalReceivable: parseFloat(r.total_receivable),
    overdueReceivable: parseFloat(r.overdue_receivable),
    totalContracts: parseFloat(r.total_contracts),
    contractCount: Number(r.contract_count),
  })));
});

/* ─── 销售经理排行 ────────────────────────────────── */
router.get("/stats/manager-ranking", async (req, res): Promise<void> => {
  const { year } = req.query as Record<string, string>;
  const yearFilter = year ? `AND payment_date LIKE '${year}%'` : "";
  const contractYearFilter = year ? `AND sign_date LIKE '${year}%'` : "";

  const rows = await db.execute(sql.raw(`
    SELECT
      m.manager,
      COALESCE(p.total_payments, 0) AS total_payments,
      COALESCE(p.payment_count, 0) AS payment_count,
      COALESCE(c.total_contracts, 0) AS total_contracts,
      COALESCE(c.contract_count, 0) AS contract_count
    FROM (
      SELECT DISTINCT sales_manager AS manager FROM payments WHERE sales_manager IS NOT NULL
      UNION
      SELECT DISTINCT sales_manager AS manager FROM contracts WHERE sales_manager IS NOT NULL
    ) m
    LEFT JOIN (
      SELECT sales_manager, SUM(amount::numeric) AS total_payments, COUNT(*) AS payment_count
      FROM payments WHERE 1=1 ${yearFilter}
      GROUP BY sales_manager
    ) p ON p.sales_manager = m.manager
    LEFT JOIN (
      SELECT sales_manager, SUM(amount_with_tax::numeric) AS total_contracts, COUNT(*) AS contract_count
      FROM contracts WHERE 1=1 ${contractYearFilter}
      GROUP BY sales_manager
    ) c ON c.sales_manager = m.manager
    ORDER BY total_payments DESC NULLS LAST
  `));

  res.json((rows as any).rows.map((r: any) => ({
    manager: r.manager,
    totalPayments: parseFloat(r.total_payments),
    paymentCount: Number(r.payment_count),
    totalContracts: parseFloat(r.total_contracts),
    contractCount: Number(r.contract_count),
  })));
});

export { router as statsRouter };
