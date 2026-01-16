import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {buildPageableParams} from "../api-query-params";
import {
  InventorySnapshotQueryRequest,
  InventorySnapshotResponse,
  PageResponse
} from "../../../shared/models";

export interface InventorySnapshotQueryOptions {
  page?: number;
  size?: number;
  sort?: string | string[];
}

@Injectable({providedIn: "root"})
export class InventorySnapshotsApiClient {
  constructor(private readonly api: ApiClient) {}

  list(
    accountId: number,
    query: InventorySnapshotQueryRequest,
    options?: InventorySnapshotQueryOptions
  ): Observable<PageResponse<InventorySnapshotResponse>> {
    const pageableParams = buildPageableParams(options);
    const params = {
      marketplace: query.marketplace,
      fromDate: query.fromDate,
      toDate: query.toDate,
      sourceProductId: query.sourceProductId,
      warehouseId: query.warehouseId,
      ...pageableParams
    };
    return this.api.get<PageResponse<InventorySnapshotResponse>>(
      `/api/accounts/${accountId}/inventory-snapshots`,
      params
    );
  }
}
