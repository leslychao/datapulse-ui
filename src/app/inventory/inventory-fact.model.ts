export interface InventoryFact {
  id: number;

  accountId: number;
  sourcePlatform: string;

  snapshotDate: string;
  sourceProductId: string;
  warehouseId: number;

  quantityTotal: number | null;
  quantityAvailable: number | null;
  quantityReserved: number | null;
  quantityInWayToClient: number | null;
  quantityInWayFromClient: number | null;
  quantityReturnToSeller: number | null;
  quantityReturnFromCustomer: number | null;

  price: number | null;
  discount: number | null;

  createdAt: string;
  updatedAt: string;
}
