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
  selector: "dp-marketing-ads-page",
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
  templateUrl: "./marketing-ads-page.component.html",
  styleUrl: "./marketing-ads-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketingAdsPageComponent {
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
    {id: "campaign", label: "Campaign", type: "select", options: [{label: "Все", value: "all"}]}
  ];

  readonly tiles: MetricTileVm[] = [
    {id: "spend", label: "Spend", value: "—"},
    {id: "impressions", label: "Impressions", value: "—"},
    {id: "clicks", label: "Clicks", value: "—"},
    {id: "drr", label: "DRR / ACoS", value: "—"},
    {id: "profitDelta", label: "Profit delta", value: "—", semantic: "profit"}
  ];

  readonly campaignColumns: TableColumnVm[] = [
    {key: "campaign", label: "Campaign", sortable: true},
    {key: "spend", label: "Spend", sortable: true, align: "right"},
    {key: "clicks", label: "Clicks", sortable: true, align: "right"},
    {key: "acos", label: "DRR / ACoS", sortable: true, align: "right"}
  ];

  constructor() {}

}
