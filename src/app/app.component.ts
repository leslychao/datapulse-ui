import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { finalize } from "rxjs/operators";

import { InventoryFactApi } from "./inventory/inventory-fact.api";
import { InventoryFact } from "./inventory/inventory-fact.model";

import { AuthRedirectService } from "./core/auth/auth-redirect.service";
import { AuthSessionService } from "./core/auth/auth-session.service";
import { AuthSessionState } from "./core/auth/auth-session.model";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {

  auth: AuthSessionState = { authenticated: false };

  rows: readonly InventoryFact[] = [];
  loading = false;
  error: string | null = null;

  // фильтры
  accountId = 1;
  marketplace = "OZON";
  fromDate: string | null = null;
  toDate: string | null = null;
  warehouseId: number | null = null;
  sourceProductId: string | null = null;
  limit = 200;

  constructor(
    private readonly api: InventoryFactApi,
    private readonly authRedirectService: AuthRedirectService,
    private readonly authSessionService: AuthSessionService
  ) {}

  ngOnInit(): void {
    // 1) Сначала проверяем есть ли сессия
    this.authSessionService.refresh().subscribe((state) => {
      this.auth = state;

      // 2) Только если авторизован — грузим данные
      if (state.authenticated) {
        this.load();
      } else {
        this.rows = [];
      }
    });
  }

  login(): void {
    this.authRedirectService.login(window.location.pathname + window.location.search);
  }

  register(): void {
    this.authRedirectService.register();
  }

  logout(): void {
    this.authSessionService.clear();
    this.authRedirectService.logout();
  }

  load(): void {
    this.error = null;

    if (!this.auth.authenticated) {
      this.rows = [];
      this.error = "Not authenticated. Please login.";
      return;
    }

    this.loading = true;

    const query = {
      accountId: this.accountId,
      marketplace: this.marketplace || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
      warehouseId: this.warehouseId ?? undefined,
      sourceProductId: this.sourceProductId || undefined,
      size: this.limit,
      page: 0
    };

    this.api.list(query)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (data: InventoryFact[]) => (this.rows = data),
      error: (err) => {
        console.error(err);
        this.rows = [];
        if (err?.status === 403) {
          this.error = "Forbidden: no access to this account or operation.";
          return;
        }
        // 401 будет перехвачен interceptor’ом и отправит на login
        this.error = "Failed to load inventory facts from /api/inventory-snapshots.";
      }
    });
  }
}
