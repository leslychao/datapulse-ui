import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, RouterModule} from "@angular/router";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {OrderPnlApi} from "../../core/api";
import {OrderPnlResponse, PageResponse} from "../../shared/models";

@Component({
  selector: "dp-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard-page.component.html",
  styleUrl: "./dashboard-page.component.css"
})
export class DashboardPageComponent implements OnInit {
  accountId: number | null = null;
  orderPnl: OrderPnlResponse[] = [];
  isLoading = false;
  loadError: string | null = null;

  readonly adminConnectionsPath = (id: number) => APP_PATHS.adminConnections(id);
  readonly adminOperatorsPath = (id: number) => APP_PATHS.adminOperators(id);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly orderPnlApi: OrderPnlApi
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
      this.fetchOrderPnl();
    }
  }

  private fetchOrderPnl(): void {
    if (this.accountId == null) {
      return;
    }
    this.isLoading = true;
    this.loadError = null;
    this.orderPnlApi.list(this.accountId, {page: 0, size: 20}).subscribe({
      next: (response: PageResponse<OrderPnlResponse>) => {
        this.orderPnl = response.content ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.loadError = "Не удалось загрузить данные по заказам.";
        this.isLoading = false;
      }
    });
  }
}
