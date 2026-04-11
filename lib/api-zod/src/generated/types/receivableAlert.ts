import { Receivable } from './receivable';
export interface ReceivableAlert {
  receivable: Receivable;
  alertType: string;
  daysLate?: number | null;
}
