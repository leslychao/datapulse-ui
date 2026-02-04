import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  PageHeaderComponent,
  PageLayoutComponent,
  FilterBarComponent,
  MetricTileGroupComponent,
  ChartCardComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {accountIdFromRoute} from "../../core/routing/account-id.util";

@Component({
  selector: "dp-overview-page",
  standalone: true,
  imports: [
    CommonModule,
    PageLayoutComponent,
    PageHeaderComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    ChartCardComponent
  ],
  templateUrl: "./overview-page.component.html",
  styleUrl: "./overview-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.noData))
    )
  }).pipe(map(({accountId, state}) => ({accountId, state})));

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Workspace", type: "select", options: [{label: "Все workspace", value: "all"}]},
    {id: "marketplace", label: "Marketplace", type: "select", options: [{label: "Все", value: "all"}]},
    {id: "from", label: "Date from", type: "date"},
    {id: "to", label: "Date to", type: "date"},
    {
      id: "granularity",
      label: "Granularity",
      type: "select",
      options: [
        {label: "Day", value: "day"},
        {label: "Week", value: "week"},
        {label: "Month", value: "month"}
      ]
    }
  ];

  readonly tiles: MetricTileVm[] = [
    {id: "revenue", label: "Revenue", value: "—"},
    {id: "orders", label: "Orders", value: "—"},
    {id: "margin", label: "Margin", value: "—", semantic: "profit"},
    {id: "returns", label: "Returns", value: "—"}
  ];

  constructor() {}

}
