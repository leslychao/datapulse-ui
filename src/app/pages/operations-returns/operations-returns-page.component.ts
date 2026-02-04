import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  FilterBarComponent,
  MetricTileGroupComponent,
  ChartCardComponent,
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
  selector: "dp-operations-returns-page",
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    PageHeaderComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    ChartCardComponent,
    DataTableCardComponent
  ],
  templateUrl: "./operations-returns-page.component.html",
  styleUrl: "./operations-returns-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationsReturnsPageComponent {
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
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]}
  ];

  readonly tiles: MetricTileVm[] = [
    {id: "buyout", label: "Buyout %", value: "—"},
    {id: "returnLosses", label: "Return losses", value: "—", semantic: "loss"},
    {id: "returnsCount", label: "Returns count", value: "—"},
    {id: "pnlImpact", label: "P&L impact", value: "—", semantic: "loss"}
  ];

  readonly problemColumns: TableColumnVm[] = [
    {key: "reason", label: "Problem area", sortable: true},
    {key: "share", label: "Share", sortable: true, align: "right"},
    {key: "impact", label: "Impact", sortable: true, align: "right"}
  ];

  constructor() {}

}
