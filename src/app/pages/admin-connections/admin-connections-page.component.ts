import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {catchError, of} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionApi, ApiError} from "../../core/api";
import {AccountConnection} from "../../shared/models";
import {ConnectionsTableComponent} from "../../features/connections";
import {LoaderComponent, ToastService} from "../../shared/ui";

@Component({
  selector: "dp-admin-connections-page",
  standalone: true,
  imports: [CommonModule, ConnectionsTableComponent, LoaderComponent],
  templateUrl: "./admin-connections-page.component.html",
  styleUrl: "./admin-connections-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminConnectionsPageComponent implements OnInit {
  accountId: number | null = null;
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly connectionApi: AccountConnectionApi,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
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
        takeUntilDestroyed(this.destroyRef),
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
    this.connectionApi
      .test(connection.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toastService.success("Подключение успешно протестировано.");
      }
    });
  }

  syncConnection(connection: AccountConnection): void {
    this.connectionApi
      .sync(connection.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toastService.success("Синхронизация запущена.");
        this.loadConnections();
      }
    });
  }

  disableConnection(connection: AccountConnection): void {
    this.connectionApi
      .disable(connection.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toastService.success("Подключение отключено.");
        this.loadConnections();
      }
    });
  }
}
