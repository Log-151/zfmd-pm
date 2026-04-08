import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * Format currency to 万元 (10,000 yuan)
 */
export function formatWanYuan(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 10000) + " 万";
}

/**
 * Format standard currency (yuan)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "yyyy-MM-dd", { locale: zhCN });
  } catch (e) {
    return "-";
  }
}
