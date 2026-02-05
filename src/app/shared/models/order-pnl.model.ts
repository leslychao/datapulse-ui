import {Marketplace} from "./account-connection.model";

export interface OrderPnlResponse {
  accountId: number;
  sourcePlatform: Marketplace;
  orderId: string;
  currency: string;
  firstFinanceDate: string;
  lastFinanceDate: string;
  revenueGross: number;
  marketplaceCommissionAmount: number;
  logisticsCostAmount: number;
  penaltiesAmount: number;
  refundAmount: number;
  netPayout: number;
  pnlAmount: number;
  itemsSoldCount: number;
  returnedItemsCount: number;
  isReturned: boolean;
  hasPenalties: boolean;
  updatedAt: string;
}

export interface OrderPnlQueryRequest {
  sourcePlatform?: Marketplace;
  dateFrom?: string;
  dateTo?: string;
  isReturned?: boolean;
  hasPenalties?: boolean;
  dateRangeValid?: boolean;
}
