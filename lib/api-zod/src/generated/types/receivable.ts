export interface Receivable {
  id: number;
  salesManager: string;
  salesContact?: string | null;
  province: string;
  group?: string | null;
  station?: string | null;
  contractNo?: string | null;
  productLine?: string | null;
  projectContent?: string | null;
  contractAmount?: number | null;
  receivableName?: string | null;
  amount: number;
  receivableDate?: string | null;
  pendingDate?: string | null;
  committedPeriodDate?: string | null;
  committedPaymentDate?: string | null;
  committedAmount?: number | null;
  actualPaymentDate?: string | null;
  actualAmount?: number | null;
  overdueMonths?: string | null;
  actualInvoiceDate?: string | null;
  actualDeliveryDate?: string | null;
  actualAcceptanceDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
