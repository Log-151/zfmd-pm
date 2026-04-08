import { Router, type IRouter } from "express";
import archiver from "archiver";
import { db, contractsTable, paymentsTable, invoicesTable, workOrdersTable, weatherServicesTable, receivablesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

function escapeCell(val: unknown): string {
  if (val == null) return "";
  const s = String(val).replace(/\r?\n/g, " ");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const lines: string[] = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(keys.map(k => escapeCell(row[k])).join(","));
  }
  return lines.join("\r\n");
}

router.get("/backup/export", async (req, res): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `兆方美迪_数据备份_${timestamp}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", () => { res.destroy(); });
  archive.pipe(res);

  const [contracts, payments, invoices, workOrders, weatherServices, receivables] = await Promise.all([
    db.select().from(contractsTable).orderBy(contractsTable.id),
    db.select().from(paymentsTable).orderBy(paymentsTable.id),
    db.select().from(invoicesTable).orderBy(invoicesTable.id),
    db.select().from(workOrdersTable).orderBy(workOrdersTable.id),
    db.select().from(weatherServicesTable).orderBy(weatherServicesTable.id),
    db.select().from(receivablesTable).orderBy(receivablesTable.id),
  ]);

  const contractsCsv = rowsToCsv(
    ["ID","合同编号","合同名称","合同类型","状态","客户","省份","集团","场站","销售经理","签订日期","开始日期","结束日期","含税金额","不含税金额","产品类型","开工申请编号","售后编号","备注","是否特殊","创建时间","更新时间"],
    contracts as Record<string, unknown>[],
    ["id","contractNo","contractName","contractType","status","customer","province","group","station","salesManager","signDate","startDate","endDate","amountWithTax","amountWithoutTax","productType","workOrderNo","afterSaleNo","notes","isSpecial","createdAt","updatedAt"]
  );

  const paymentsCsv = rowsToCsv(
    ["ID","合同ID","合同编号","付款单位","省份","集团","场站","销售经理","回款日期","回款金额","回款比例","备注","创建时间","更新时间"],
    payments as Record<string, unknown>[],
    ["id","contractId","contractNo","payer","province","group","station","salesManager","paymentDate","amount","paymentRatio","notes","createdAt","updatedAt"]
  );

  const invoicesCsv = rowsToCsv(
    ["ID","合同ID","合同编号","发票号","客户","省份","场站","销售经理","开票日期","含税金额","不含税金额","税率","预计回款日期","预计回款金额","实际回款日期","实际回款金额","作废日期","状态","备注","创建时间","更新时间"],
    invoices as Record<string, unknown>[],
    ["id","contractId","contractNo","invoiceNo","customer","province","station","salesManager","invoiceDate","amountWithTax","amountWithoutTax","taxRate","expectedPaymentDate","expectedPaymentAmount","actualPaymentDate","actualPaymentAmount","voidDate","status","notes","createdAt","updatedAt"]
  );

  const workOrdersCsv = rowsToCsv(
    ["ID","开工申请编号","合同编号","客户","省份","场站","产品类型","销售经理","申请日期","审批日期","状态","备注","创建时间","更新时间"],
    workOrders as Record<string, unknown>[],
    ["id","workOrderNo","contractNo","customer","province","station","productType","salesManager","applicationDate","approvalDate","status","notes","createdAt","updatedAt"]
  );

  const weatherCsv = rowsToCsv(
    ["ID","场站名称","省份","集团","合同编号","客户","销售经理","产品类型","服务开始日期","服务结束日期","状态","停机开始日期","停机结束日期","备注","创建时间","更新时间"],
    weatherServices as Record<string, unknown>[],
    ["id","stationName","province","group","contractNo","customer","salesManager","productType","serviceStartDate","serviceEndDate","status","outageStartDate","outageEndDate","notes","createdAt","updatedAt"]
  );

  const receivablesCsv = rowsToCsv(
    ["ID","合同ID","合同编号","客户","省份","场站","销售经理","收款类型","金额","预计收款日期","交付日期","验收日期","开票日期","实际收款日期","逾期天数","状态","是否坏账","备注","创建时间","更新时间"],
    receivables as Record<string, unknown>[],
    ["id","contractId","contractNo","customer","province","station","salesManager","receivableType","amount","expectedDate","deliveryDate","acceptanceDate","invoiceDate","actualPaymentDate","daysLate","status","isBadDebt","notes","createdAt","updatedAt"]
  );

  const BOM = "\uFEFF";
  archive.append(BOM + contractsCsv,      { name: "01_合同管理.csv" });
  archive.append(BOM + paymentsCsv,       { name: "02_回款管理.csv" });
  archive.append(BOM + invoicesCsv,       { name: "03_开票管理.csv" });
  archive.append(BOM + workOrdersCsv,     { name: "04_开工申请.csv" });
  archive.append(BOM + weatherCsv,        { name: "05_数值天气预报.csv" });
  archive.append(BOM + receivablesCsv,    { name: "06_应收款管理.csv" });

  const summary = `兆方美迪 项目管理系统 - 数据备份报告\r\n备份时间：${new Date().toLocaleString("zh-CN")}\r\n\r\n` +
    `合同管理：${contracts.length} 条记录\r\n` +
    `回款管理：${payments.length} 条记录\r\n` +
    `开票管理：${invoices.length} 条记录\r\n` +
    `开工申请：${workOrders.length} 条记录\r\n` +
    `数值天气预报：${weatherServices.length} 条记录\r\n` +
    `应收款管理：${receivables.length} 条记录\r\n\r\n` +
    `所有 CSV 文件均使用 UTF-8 BOM 编码，可直接用 Excel 打开。`;

  archive.append(summary, { name: "00_备份说明.txt" });
  await archive.finalize();
});

export default router;
