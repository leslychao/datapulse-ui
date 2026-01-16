export interface OrderPnlResponse {
  accountId: number;
  sourcePlatform: string;
  orderId: string;
  currency: string;
  firstFinanceDate: string | null;
  lastFinanceDate: string | null;
  revenueGross: string | null;
  marketplaceCommissionAmount: string | null;
  logisticsCostAmount: string | null;
  penaltiesAmount: string | null;
  refundAmount: string | null;
  netPayout: string | null;
  pnlAmount: string | null;
  itemsSoldCount: number;
  returnedItemsCount: number;
  isReturned: boolean;
  hasPenalties: boolean;
  updatedAt: string;
}

export interface OrderPnlQueryRequest {
  sourcePlatform?: string;
  dateFrom?: string;
  dateTo?: string;
  isReturned?: boolean;
  hasPenalties?: boolean;
}
