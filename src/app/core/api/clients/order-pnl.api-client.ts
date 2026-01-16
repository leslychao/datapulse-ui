import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {buildPageableParams} from "../api-query-params";
import {OrderPnlQueryRequest, OrderPnlResponse, PageResponse} from "../../../shared/models";

export interface OrderPnlQueryOptions {
  page?: number;
  size?: number;
  sort?: string | string[];
}

@Injectable({providedIn: "root"})
export class OrderPnlApiClient {
  constructor(private readonly api: ApiClient) {}

  list(
    accountId: number,
    query: OrderPnlQueryRequest,
    options?: OrderPnlQueryOptions
  ): Observable<PageResponse<OrderPnlResponse>> {
    const pageableParams = buildPageableParams(options);
    const params = {
      sourcePlatform: query.sourcePlatform,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isReturned: query.isReturned,
      hasPenalties: query.hasPenalties,
      ...pageableParams
    };
    return this.api.get<PageResponse<OrderPnlResponse>>(
      `/api/accounts/${accountId}/order-pnl`,
      params
    );
  }
}
