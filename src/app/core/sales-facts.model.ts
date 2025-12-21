export interface SalesFact {
  id: number;
  accountId: number;
  sourcePlatform: string;
  sourceEventId: string;
  orderId: string | null;
  sourceProductId: string | null;
  offerId: string | null;
  warehouseId: number | null;
  categoryId: number | null;
  quantity: number;
  saleDate: string;
  createdAt: string;
}
