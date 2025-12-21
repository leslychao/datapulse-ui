import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map } from "rxjs";

import { SalesFact } from "./sales-facts.model";
import { RawSalesFact, SalesFactMapper } from "./sales-facts.raw";

@Injectable({ providedIn: "root" })
export class SalesFactsApi {

  constructor(private readonly http: HttpClient) {}

  list(params: {
    accountId?: number;
    sourcePlatform?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Observable<readonly SalesFact[]> {

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        httpParams = httpParams.set(k, String(v));
      }
    });

    return this.http.get<readonly SalesFact[]>(
      "/api/facts/sales",
      { params: httpParams }
    );
  }

  listMock(): Observable<readonly SalesFact[]> {
    return this.http.get<readonly RawSalesFact[]>("/fact_sales.json").pipe(
      map(items => items.map(SalesFactMapper.toModel))
    );
  }

  listWithFallback(params: {
    accountId?: number;
    sourcePlatform?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Observable<readonly SalesFact[]> {
    return this.list(params).pipe(
      catchError(() => this.listMock())
    );
  }
}
