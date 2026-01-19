import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {combineLatest} from "rxjs";
import {map, switchMap} from "rxjs/operators";

import {
  DashboardShellComponent,
  MetricTileGroupComponent,
  DataTableCardComponent
} from "../../shared/ui";
import {DashboardStateQuery} from "../../queries/dashboard-state.query";
import {DATA_STATE} from "../../shared/models";
import {MetricTileVm} from "../../vm/metric-tile.vm";
import {TableColumnVm} from "../../vm/table-column.vm";
import {accountIdFromRoute} from "../../core/routing/account-id.util";

@Component({
  selector: "dp-data-freshness-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, MetricTileGroupComponent, DataTableCardComponent],
  templateUrl: "./data-freshness-page.component.html",
  styleUrl: "./data-freshness-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataFreshnessPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardState = inject(DashboardStateQuery);

  private readonly accountId$ = accountIdFromRoute(this.route);
  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    state: this.accountId$.pipe(
      switchMap((accountId) => this.dashboardState.getState(accountId, DATA_STATE.unavailable))
    )
  }).pipe(map(({accountId, state}) => ({accountId, state})));

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

  readonly alerts: string[] = ["Задержки данных", "Схема изменилась", "Нет партиций"];

  constructor() {}

}
