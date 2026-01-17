import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {distinctUntilChanged, map, of, switchMap} from "rxjs";
import {OrderPnlApiClient} from "../../core/api";
import {OrderPnlResponse, PageResponse} from "../../shared/models";
import {DashboardShellComponent} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface OrdersViewModel {
  accountId: number | null;
  state: LoadState<OrderPnlResponse[], string>;
}

@Component({
  selector: "dp-dashboard-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent],
  templateUrl: "./dashboard-page.component.html",
  styleUrl: "./dashboard-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderPnlApi = inject(OrderPnlApiClient);

  private readonly accountId$ = this.route.paramMap.pipe(
    map((params) => {
      const accountIdParam = params.get("accountId");
      if (accountIdParam == null) {
        return null;
      }
      const accountId = Number(accountIdParam);
      return Number.isFinite(accountId) ? accountId : null;
    }),
    distinctUntilChanged()
  );

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: "Account is not selected."} as const
        });
      }
      return this.orderPnlApi
        .list(accountId, {}, {page: 0, size: 20})
        .pipe(
          map((response: PageResponse<OrderPnlResponse>) => response.content ?? []),
          toLoadState<OrderPnlResponse[], string>(
            () => "Не удалось загрузить данные по заказам."
          ),
          map((state) => ({accountId, state}))
        );
    })
  );

}
