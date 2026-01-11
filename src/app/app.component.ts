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

import { MeApi } from "./api/me/me.api";
import { MeResponse, UserAccountAccess } from "./api/me/me.model";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {

  auth: AuthSessionState = { authenticated: false };
  me: MeResponse | null = null;

  // me/accounts
  accounts: readonly UserAccountAccess[] = [];
  accountId: number | null = null;

  // inventory table
  rows: readonly InventoryFact[] = [];
  loading = false;
  error: string | null = null;

  // filters
  marketplace = "OZON";
  fromDate: string | null = null;
  toDate: string | null = null;
  warehouseId: number | null = null;
  sourceProductId: string | null = null;
  limit = 200;

  constructor(
    private readonly inventoryApi: InventoryFactApi,
    private readonly meApi: MeApi,
    private readonly authRedirectService: AuthRedirectService,
    private readonly authSessionService: AuthSessionService
  ) {}

  ngOnInit(): void {
    this.authSessionService.refresh().subscribe((state) => {
      this.auth = state;

      if (!state.authenticated) {
        this.resetAuthenticatedState();
        return;
      }

      this.loadMe();
    });
  }

  private resetAuthenticatedState(): void {
    this.me = null;
    this.accounts = [];
    this.accountId = null;
    this.rows = [];
    this.error = null;
  }

  private loadMe(): void {
    this.meApi.me().subscribe({
      next: (me: MeResponse) => {
        this.me = me;
      },
      error: (err: unknown) => {
        console.error(err);
        this.me = null;
      }
    });
  }

  onAccountChanged(_: number | null): void {
    if (this.auth.authenticated && this.accountId != null) {
      this.load();
      return;
    }
    this.rows = [];
  }

  login(): void {
    this.authRedirectService.login(window.location.pathname + window.location.search);
  }

  register(): void {
    this.authRedirectService.register();
  }

  logout(): void {
    this.authSessionService.clear();
    this.resetAuthenticatedState();
    this.authRedirectService.logout();
  }

  load(): void {
    this.error = null;

    if (!this.auth.authenticated) {
      this.rows = [];
      this.error = "Not authenticated. Please login.";
      return;
    }

    if (this.accountId == null) {
      this.rows = [];
      this.error = "Account is not selected.";
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

    this.inventoryApi.list(query)
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (data: InventoryFact[]) => (this.rows = data),
      error: (err: any) => {
        console.error(err);
        this.rows = [];

        if (err?.status === 403) {
          this.error = "Forbidden: no access to this account or operation.";
          return;
        }

        this.error = "Failed to load inventory facts.";
      }
    });
  }
}
