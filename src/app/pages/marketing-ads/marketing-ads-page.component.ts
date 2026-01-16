import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";

import {
  DashboardShellComponent,
  FilterBarComponent,
  MetricTileGroupComponent,
  ChartCardComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {FilterFieldVm} from "../../vm/filter-field.vm";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";

@Component({
  selector: "dp-marketing-ads-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    FilterBarComponent,
    MetricTileGroupComponent,
    ChartCardComponent,
    DataTableCardComponent
  ],
  templateUrl: "./marketing-ads-page.component.html",
  styleUrl: "./marketing-ads-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketingAdsPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;

  readonly filters: FilterFieldVm[] = [
    {id: "account", label: "Account", type: "select", options: [{label: "Все аккаунты", value: "all"}]},
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dashboardState: DashboardStateQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    this.state$ = this.dashboardState.getState(this.accountId, DATA_STATE.unavailable);
  }
}
