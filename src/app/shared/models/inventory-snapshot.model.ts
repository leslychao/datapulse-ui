import {Marketplace} from "./account-connection.model";

export interface InventorySnapshotQueryRequest {
  marketplace?: Marketplace;
  fromDate?: string;
  toDate?: string;
  sourceProductId?: string;
  warehouseId?: number;
  dateRangeValid?: boolean;
}

export interface InventorySnapshotResponse {
  id: number;
  accountId: number;
  sourcePlatform: string;
  snapshotDate: string;
  sourceProductId: string;
  warehouseId: number;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInWayToClient: number;
  quantityInWayFromClient: number;
  quantityReturnToSeller: number;
  quantityReturnFromCustomer: number;
}
