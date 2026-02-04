import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  FilterBarComponent,
  MetricTileGroupComponent,
  DataTableCardComponent,
  PageHeaderComponent,
  PageLayoutComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";
import {accountIdFromRoute} from "../../core/routing/account-id.util";

@Component({
  selector: "dp-finance-unit-economics-page",
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    PageHeaderComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    DataTableCardComponent
  ],
  templateUrl: "./finance-unit-economics-page.component.html",
  styleUrl: "./finance-unit-economics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceUnitEconomicsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.unavailable))
    )
  }).pipe(map(({accountId, state}) => ({accountId, state})));

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Workspace", type: "select", options: [{label: "Все workspace", value: "all"}]},
    {id: "from", label: "Date from", type: "date"},
    {id: "to", label: "Date to", type: "date"},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]},
    {id: "search", label: "Search", type: "search", placeholder: "SKU или название"}
  ];

  readonly kpis: MetricTileVm[] = [
    {id: "avgMargin", label: "Avg margin / unit", value: "—", semantic: "profit"},
    {id: "topLoss", label: "Top loss SKUs", value: "—", semantic: "loss"}
  ];

  readonly columns: TableColumnVm[] = [
    {key: "sku", label: "SKU", sortable: true},
    {key: "name", label: "Product", sortable: true},
    {key: "units", label: "Units", sortable: true, align: "right"},
    {key: "margin", label: "Margin / unit", sortable: true, align: "right", semantic: "profitLoss"}
  ];

  constructor() {}

}
