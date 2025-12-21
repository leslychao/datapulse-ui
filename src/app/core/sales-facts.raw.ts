import { SalesFact } from "./sales-facts.model";

export interface RawSalesFact {
  id: number;
  account_id: number;
  source_platform: string;
  source_event_id: string;
  order_id: string | null;
  source_product_id: string | null;
  offer_id: string | null;
  warehouse_id: number | null;
  category_id: number | null;
  quantity: number;
  sale_date: string;
  created_at: string;
}

export class SalesFactMapper {
  private constructor() {}

  static toModel(raw: RawSalesFact): SalesFact {
    return {
      id: raw.id,
      accountId: raw.account_id,
      sourcePlatform: raw.source_platform,
      sourceEventId: raw.source_event_id,
      orderId: raw.order_id,
      sourceProductId: raw.source_product_id,
      offerId: raw.offer_id,
      warehouseId: raw.warehouse_id,
      categoryId: raw.category_id,
      quantity: raw.quantity,
      saleDate: raw.sale_date,
      createdAt: raw.created_at
    };
  }
}
