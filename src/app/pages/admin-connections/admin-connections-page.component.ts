import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {catchError, of} from "rxjs";

import {AccountConnectionApi, ApiError} from "../../core/api";
import {AccountConnection} from "../../shared/models";
import {AccountContextService} from "../../core/state";
import {ConnectionsTableComponent} from "../../features/connections";
import {LoaderComponent, ToastService} from "../../shared/ui";

@Component({
  selector: "dp-admin-connections-page",
  standalone: true,
  imports: [CommonModule, ConnectionsTableComponent, LoaderComponent],
  templateUrl: "./admin-connections-page.component.html",
  styleUrl: "./admin-connections-page.component.css"
})
export class AdminConnectionsPageComponent implements OnInit {
  accountId: number | null = null;
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly connectionApi: AccountConnectionApi,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
      this.loadConnections();
    } else {
      this.loading = false;
    }
  }

  loadConnections(): void {
    if (this.accountId == null) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.connectionApi
      .list(this.accountId)
      .pipe(
        catchError((error: ApiError) => {
          this.error = error;
          return of([]);
        })
      )
      .subscribe((connections) => {
        this.connections = connections;
        this.loading = false;
      });
  }

  testConnection(connection: AccountConnection): void {
    this.connectionApi.test(connection.id).subscribe({
      next: () => {
        this.toastService.success("Подключение успешно протестировано.");
      }
    });
  }

  syncConnection(connection: AccountConnection): void {
    this.connectionApi.sync(connection.id).subscribe({
      next: () => {
        this.toastService.success("Синхронизация запущена.");
        this.loadConnections();
      }
    });
  }

  disableConnection(connection: AccountConnection): void {
    this.connectionApi.disable(connection.id).subscribe({
      next: () => {
        this.toastService.success("Подключение отключено.");
        this.loadConnections();
      }
    });
  }
}
