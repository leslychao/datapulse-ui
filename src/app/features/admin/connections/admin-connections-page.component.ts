import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {catchError, of} from "rxjs";

import {AccountConnectionApi} from "../../../api/account-connections/account-connection.api";
import {AccountConnection} from "../../../models/account-connection.model";
import {AccountContextService} from "../../../core/account/account-context.service";
import {ApiError} from "../../../core/api/api-error.model";
import {ConnectionsTableComponent} from "./connections-table.component";

@Component({
  selector: "dp-admin-connections-page",
  standalone: true,
  imports: [CommonModule, ConnectionsTableComponent],
  templateUrl: "./admin-connections-page.component.html",
  styleUrl: "./admin-connections-page.component.css"
})
export class AdminConnectionsPageComponent implements OnInit {
  accountId: number | null = null;
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;
  actionMessage: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly connectionApi: AccountConnectionApi
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
    this.actionMessage = null;
    this.connectionApi.test(connection.id).subscribe({
      next: () => {
        this.actionMessage = "Подключение успешно протестировано.";
      },
      error: (error: ApiError) => {
        this.actionMessage = error.message;
      }
    });
  }

  syncConnection(connection: AccountConnection): void {
    this.actionMessage = null;
    this.connectionApi.sync(connection.id).subscribe({
      next: () => {
        this.actionMessage = "Синхронизация запущена.";
        this.loadConnections();
      },
      error: (error: ApiError) => {
        this.actionMessage = error.message;
      }
    });
  }

  disableConnection(connection: AccountConnection): void {
    this.actionMessage = null;
    this.connectionApi.disable(connection.id).subscribe({
      next: () => {
        this.actionMessage = "Подключение отключено.";
        this.loadConnections();
      },
      error: (error: ApiError) => {
        this.actionMessage = error.message;
      }
    });
  }
}
