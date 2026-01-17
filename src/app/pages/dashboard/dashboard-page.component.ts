import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {catchError, finalize, map} from "rxjs/operators";
import {of} from "rxjs";
import {OrderPnlApiClient} from "../../core/api";
import {OrderPnlResponse, PageResponse} from "../../shared/models";
import {DashboardShellComponent} from "../../shared/ui";

@Component({
  selector: "dp-dashboard-page",
  standalone: true,
  imports: [CommonModule, DashboardShellComponent],
  templateUrl: "./dashboard-page.component.html",
  styleUrl: "./dashboard-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  accountId: number | null = null;
  orderPnl: OrderPnlResponse[] = [];
  isLoading = false;
  loadError: string | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderPnlApi: OrderPnlApiClient
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.fetchOrderPnl();
    }
  }

  private fetchOrderPnl(): void {
    if (this.accountId == null) {
      return;
    }
    this.isLoading = true;
    this.loadError = null;
    this.orderPnlApi
      .list(this.accountId, {}, {page: 0, size: 20})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((response: PageResponse<OrderPnlResponse>) => response.content ?? []),
        catchError(() => {
          this.loadError = "Не удалось загрузить данные по заказам.";
          return of([] as OrderPnlResponse[]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((rows) => {
        this.orderPnl = rows;
      });
  }
}
