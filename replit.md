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

## Database Tables

- `contracts` — Sales contracts with tax/no-tax amounts, special flags
- `contract_change_logs` — Audit trail for contract changes
- `payments` — Payment records with payer/province/manager dimensions
- `invoices` — Invoice records with expected vs actual payment dates
- `work_orders` — Work order applications with contract association
- `weather_services` — Weather forecast service records with expiry dates
- `receivables` — Receivable tracking with delivery/acceptance/payment dates

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
