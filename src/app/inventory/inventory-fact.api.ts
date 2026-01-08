import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { InventoryFact } from "./inventory-fact.model";

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface InventoryFactQuery {
  accountId: number;
  marketplace?: string;
  fromDate?: string;
  toDate?: string;
  warehouseId?: number;
  sourceProductId?: string;
  size?: number;
  page?: number;
}

@Injectable({ providedIn: "root" })
export class InventoryFactApi {

  // идём через proxy на 8080
  private readonly baseUrl = "/api/inventory-snapshots";

  constructor(private readonly http: HttpClient) {}

  list(query: InventoryFactQuery): Observable<InventoryFact[]> {
    let params = new HttpParams().set("accountId", String(query.accountId));

    if (query.marketplace) {
      params = params.set("marketplace", query.marketplace);
    }
    if (query.fromDate) {
      params = params.set("fromDate", query.fromDate);
    }
    if (query.toDate) {
      params = params.set("toDate", query.toDate);
    }
    if (query.warehouseId != null) {
      params = params.set("warehouseId", String(query.warehouseId));
    }
    if (query.sourceProductId) {
      params = params.set("sourceProductId", query.sourceProductId);
    }

    params = params.set("page", String(query.page ?? 0));
    params = params.set("size", String(query.size ?? 200));
    params = params.set("sort", "snapshotDate,desc");

    return this.http
    .get<Page<InventoryFact>>(this.baseUrl, { params })
    .pipe(map((page) => page.content));
  }
}
