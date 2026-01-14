import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Observable} from "rxjs";

import {AccountContextService} from "../../core/state";
import {
  DashboardShellComponent,
  MetricTileGroupComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery, DashboardStateResult} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";

@Component({
  selector: "dp-data-freshness-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, MetricTileGroupComponent, DataTableCardComponent],
  templateUrl: "./data-freshness-page.component.html",
  styleUrl: "./data-freshness-page.component.css"
})
export class DataFreshnessPageComponent implements OnInit {
  accountId: number | null = null;
  state$?: Observable<DashboardStateResult>;

  readonly tiles: MetricTileVm[] = [
    {id: "rawUpdated", label: "RAW updated", value: "—"},
    {id: "martsUpdated", label: "Marts updated", value: "—"},
    {id: "slaBreaches", label: "SLA breaches", value: "—", semantic: "loss"},
    {id: "quality", label: "Quality checks", value: "—"}
  ];

  readonly columns: TableColumnVm[] = [
    {key: "entity", label: "Entity", sortable: true},
    {key: "updated", label: "Last update", sortable: true},
    {key: "status", label: "Status", sortable: true},
    {key: "lag", label: "Lag duration", sortable: true, align: "right"}
  ];

  readonly alerts: string[] = ["Data delays", "Schema drift", "Missing partitions"];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly dashboardState: DashboardStateQuery
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
    }
    this.state$ = this.dashboardState.getState(this.accountId, DATA_STATE.unavailable);
  }
}
