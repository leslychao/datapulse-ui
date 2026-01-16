import {Marketplace} from "./account-connection.dto";

export interface InventorySnapshotQueryRequest {
  marketplace?: Marketplace;
  fromDate?: string;
  toDate?: string;
  sourceProductId?: string;
  warehouseId?: string;
}

export interface InventorySnapshotResponse {}
