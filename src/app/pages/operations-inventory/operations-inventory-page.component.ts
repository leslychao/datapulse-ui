import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent,
  DataTableCardComponent,
  ChartCardComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";
import {accountIdFromRoute} from "../../core/routing/account-id.util";

@Component({
  selector: "dp-operations-inventory-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    DataTableCardComponent,
    ChartCardComponent
  ],
  templateUrl: "./operations-inventory-page.component.html",
  styleUrl: "./operations-inventory-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsInventoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.unavailable))
    )
  }).pipe(map(({accountId, state}) => ({accountId, state})));
  activeTab: "warehouse" | "sku" = "warehouse";

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]},
    {id: "asOf", label: "As of", type: "date"},
    {id: "warehouse", label: "Warehouse", type: "select", options: [{label: "Все", value: "all"}]}
  ];

  readonly alerts: MetricTileVm[] = [
    {id: "outOfStock", label: "Out of stock", value: "—"},
    {id: "lowDoc", label: "Low DoC", value: "—"},
    {id: "excess", label: "Excess stock", value: "—"}
  ];

  readonly columnsByWarehouse: TableColumnVm[] = [
    {key: "warehouse", label: "Warehouse", sortable: true},
    {key: "skuCount", label: "SKUs", sortable: true, align: "right"},
    {key: "doc", label: "Days of cover", sortable: true, align: "right"}
  ];

  readonly columnsBySku: TableColumnVm[] = [
    {key: "sku", label: "SKU", sortable: true},
    {key: "name", label: "Product", sortable: true},
    {key: "stock", label: "Stock", sortable: true, align: "right"},
    {key: "doc", label: "Days of cover", sortable: true, align: "right"}
  ];

  constructor() {}

  setTab(tab: "warehouse" | "sku"): void {
    this.activeTab = tab;
  }
}
