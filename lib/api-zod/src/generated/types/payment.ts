export interface Payment {
  id: number;
  paymentDate: string;
  payer: string;
  province: string;
  group: string;
  station: string;
  productLine?: string | null;
  projectContent?: string | null;
  contractNo?: string | null;
  billAmount?: number | null;
  cashAmount?: number | null;
  paymentRatio?: number | null;
  paymentItemName?: string | null;
  salesManager: string;
  salesContact?: string | null;
  notes?: string | null;
  paymentType?: string | null;
  amount: number;
  contractId?: number | null;
  createdAt: string;
  updatedAt: string;
}
