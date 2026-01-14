import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {OrderPnlResponse, PageResponse} from "../../../../shared/models";

export type OrderPnlQueryParams = Record<
  string,
  string | number | boolean | undefined
> & {
  page?: number;
  size?: number;
};

@Injectable({providedIn: "root"})
export class OrderPnlApi {
  constructor(private readonly api: ApiClient) {}

  list(accountId: number, params: OrderPnlQueryParams): Observable<PageResponse<OrderPnlResponse>> {
    return this.api.get<PageResponse<OrderPnlResponse>>(
      `/api/accounts/${accountId}/order-pnl`,
      params
    );
  }
}
