import {Marketplace} from "./account-connection.model";

export interface InventorySnapshotQueryRequest {
  marketplace?: Marketplace;
  fromDate?: string;
  toDate?: string;
  sourceProductId?: string;
  warehouseId?: string;
}

export interface InventorySnapshotResponse {}
