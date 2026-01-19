import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  DashboardShellComponent,
  FilterBarComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {TableColumnVm} from "../../vm/table-column.vm";
import {accountIdFromRoute} from "../../core/routing/account-id.util";

@Component({
  selector: "dp-operations-sales-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, FilterBarComponent, DataTableCardComponent],
  templateUrl: "./operations-sales-page.component.html",
  styleUrl: "./operations-sales-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsSalesPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.noData))
    )
  }).pipe(map(({accountId, state}) => ({accountId, state})));
  activeTab: "sales" | "orders" | "returns" = "sales";
  quickFilter: "today" | "60m" | "24h" = "today";

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]},
    {id: "search", label: "Search", type: "search", placeholder: "ID заказа или SKU"}
  ];

  readonly columns: TableColumnVm[] = [
    {key: "id", label: "ID", sortable: true},
    {key: "marketplace", label: "Marketplace", sortable: true},
    {key: "status", label: "Status", sortable: true},
    {key: "amount", label: "Amount", sortable: true, align: "right", semantic: "profitLoss"},
    {key: "updated", label: "Updated", sortable: true}
  ];

  constructor() {}

  setTab(tab: "sales" | "orders" | "returns"): void {
    this.activeTab = tab;
  }

  setQuickFilter(filter: "today" | "60m" | "24h"): void {
    this.quickFilter = filter;
  }
}
