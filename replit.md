# 新能源风电光伏预测公司 - 项目管理系统

## Overview

A comprehensive project management system for a wind/solar energy forecasting company. Covers 7 core operational modules corresponding to Excel files 04-10.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts + Wouter

## Artifacts

- `artifacts/api-server` — Express 5 REST API, serves at `/api`
- `artifacts/project-mgmt` — React + Vite frontend, serves at `/`

## Modules

| Module | File | Description |
|--------|------|-------------|
| 回款管理 | 04 | Payment/receivables tracking, annual/quarterly stats, payer lookup, export |
| 开票管理 | 05 | Invoice management, overdue alerts, void tracking, export |
| 合同管理 | 06 | Sales contract management, change logs, special contract filtering |
| 开工申请 | 07 | Work order management, contract association alerts |
| 数值天气 | 08 | Weather forecast service expiry alerts (1m/2m/3m/expired), outage tracking |
| 应收款管理 | 09 | Receivable tracking, delivery/acceptance dates, late payment calculation |
| 项目管理 | 10 | Dashboard, aging analysis, 14 financial metrics, bad debt tracking |
| 统计分析 | — | Cross-module analytics: annual overview, contract/payment/invoice/receivables analysis, weather expiry, manager rankings, contract payment tracking |

## Database Tables

- `contracts` — Sales contracts with tax/no-tax amounts, special flags
- `contract_change_logs` — Audit trail for contract changes
- `payments` — Payment records: paymentDate, payer, province, group, station, productLine, projectContent, contractNo, billAmount, cashAmount, paymentRatio, paymentItemName, salesManager, salesContact, notes, paymentType, amount (Excel 04 column order)
- `invoices` — Invoice records with expected vs actual payment dates
- `work_orders` — Work order applications with contract association
- `weather_services` — 15-field Excel 08 schema: contractSalesManager, salesManager, province, group, station, stationType, forecastStartDate, officialForecastDate, serviceEndDate, overdueMonths, isOverdue, estimatedContractAmount, estimatedContractDate, renewalNotes, notes
- `receivables` — 23-field Excel 09 schema: salesManager, salesContact, province, group, station, contractNo, productLine, projectContent, contractAmount, receivableName, amount, receivableDate, pendingDate, committedPeriodDate, committedPaymentDate, committedAmount, actualPaymentDate, actualAmount, overdueMonths, actualInvoiceDate, actualDeliveryDate, actualAcceptanceDate, paymentTerms

## Features

- **Login authentication** — Session-based auth (express-session), hardcoded account ZFMD/ZFMD; 7-day cookie; all API routes protected by `requireAuth` middleware
- **Custom fields** — Per-module custom field definitions stored in `custom_field_defs` table; values stored as JSONB in each module's `customFields` column; fully displayed in all 6 module table views (headers + cells)
- **Full data backup** — One-click ZIP download of all 6 module CSVs (UTF-8 BOM, Excel-compatible), via sidebar "一键备份全量数据" button
- **Statistics & analytics** — 8-tab analytics module with cross-module charts: annual overview, contract/payment/invoice/receivable analysis, weather expiry, manager rankings, contract-payment correlation
- **Global dashboard** — Key financial KPIs, overdue alerts, weather expiry alerts, aging analysis
- **CSV import** — Batch import for all 6 modules with field mapping
- **CSV export** — Per-module filtered export
- **Table borders** — Global CSS (border-collapse + 1px border on th/td) applied across all module tables
- **Excel column order compliance** — All 7 module tables exactly match their respective Excel source file column order (04-10)
- **Draggable column headers** — All 6 data modules use `useColumnOrder` hook (localStorage key: `colorder_v1_{module}`) enabling HTML5 drag-to-reorder column headers; reset button restores default order; Payments/WeatherServices/Receivables have a non-orderable fixed 序号 column
- **Custom field drag-to-reorder** — Custom field definitions can be reordered via drag in CustomFieldsManager; order persisted via `reorderDefs` in `use-custom-fields.ts`
- **Mutation API** — All create/update/delete hooks use `{ data: ... }` and `{ id: number, data: ... }` patterns (NOT `body`/`pathParams`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
