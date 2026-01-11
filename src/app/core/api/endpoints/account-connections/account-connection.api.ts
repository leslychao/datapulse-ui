import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {
  AccountConnection,
  AccountConnectionCreateRequest,
  AccountConnectionSyncStatus
} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class AccountConnectionApi {
  constructor(private readonly api: ApiClient) {}

  private readonly etlScenarioEvents = [
    {event: "WAREHOUSE_DICT", dateMode: "LAST_DAYS", lastDays: 30},
    {event: "CATEGORY_DICT", dateMode: "LAST_DAYS", lastDays: 30},
    {event: "TARIFF_DICT", dateMode: "LAST_DAYS", lastDays: 30},
    {event: "PRODUCT_DICT", dateMode: "LAST_DAYS", lastDays: 7},
    {event: "SALES_FACT", dateMode: "LAST_DAYS", lastDays: 7},
    {event: "INVENTORY_FACT", dateMode: "LAST_DAYS", lastDays: 7},
    {event: "FACT_FINANCE", dateMode: "LAST_DAYS", lastDays: 7}
  ] as const;

  list(accountId: number): Observable<AccountConnection[]> {
    return this.api.get<AccountConnection[]>("/api/account-connections", {accountId});
  }

  create(request: AccountConnectionCreateRequest): Observable<AccountConnection> {
    return this.api.post<AccountConnection, AccountConnectionCreateRequest>(
      "/api/account-connections",
      request
    );
  }

  test(connectionId: number): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `/api/account-connections/${connectionId}/test`,
      {}
    );
  }

  sync(accountId: number): Observable<void> {
    return this.api.post<void, {accountId: number; events: typeof this.etlScenarioEvents}>(
      "/api/etl/scenario/run",
      {
        accountId,
        events: this.etlScenarioEvents
      }
    );
  }

  syncStatus(connectionId: number): Observable<AccountConnectionSyncStatus> {
    return this.api.get<AccountConnectionSyncStatus>(
      `/api/account-connections/${connectionId}/sync/status`
    );
  }

  disable(connectionId: number): Observable<void> {
    return this.api.post<void, Record<string, never>>(
      `/api/account-connections/${connectionId}/disable`,
      {}
    );
  }
}
