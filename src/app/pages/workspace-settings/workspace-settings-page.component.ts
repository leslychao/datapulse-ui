import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {combineLatest, of, Subject, switchMap} from "rxjs";
import {finalize, map, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountsApiClient, ApiError, IamApiClient} from "../../core/api";
import {AccountResponse, AccountUpdateRequest} from "../../shared/models";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
import {AccountContextService} from "../../core/state";
import {APP_PATHS} from "../../core/app-paths";
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  FormFieldComponent,
  InputComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  PageLayoutComponent,
  ToastService
} from "../../shared/ui";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface WorkspaceSettingsViewModel {
  accountId: number | null;
  accountState: LoadState<AccountResponse | null, ApiError>;
  totalWorkspaces: number;
}

type ArchiveIntent = "archive" | "restore";

@Component({
  selector: "dp-workspace-settings-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    FormFieldComponent,
    InputComponent,
    ButtonComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ConfirmDialogComponent
  ],
  templateUrl: "./workspace-settings-page.component.html",
  styleUrl: "./workspace-settings-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceSettingsPageComponent {
  private readonly iamApi = inject(IamApiClient);
  private readonly accountsApi = inject(AccountsApiClient);
  private readonly accountContext = inject(AccountContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;

  archiveDialogVisible = false;
  deleteDialogVisible = false;

  archiveDialogTitle = "Archive workspace?";
  archiveDialogDescription = "Workspace будет скрыт и синхронизации остановятся.";
  archiveDialogConfirmLabel = "Archive";
  archiveDialogIsDanger = false;

  private archiveIntent: ArchiveIntent = "archive";

  /**
   * Последний успешно загруженный workspace.
   * Нужен, чтобы выполнять Archive/Restore как lifecycle-action независимо от состояния формы,
   * и при этом отправлять полный AccountUpdateRequest (name обязателен в контракте).
   */
  private lastLoadedAccount: AccountResponse | null = null;

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  readonly form: FormGroup<{
    name: FormControl<string>;
  }> = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(32)]]
  });

  readonly vm$ = combineLatest({
    accountId: this.accountId$,
    refresh: this.refresh$.pipe(startWith(void 0))
  }).pipe(
    switchMap(({accountId}) => {
      if (accountId == null) {
        return of({
          accountId: null,
          accountState: {status: "ready", data: null},
          totalWorkspaces: 0
        } as WorkspaceSettingsViewModel);
      }

      return this.iamApi.getAccessibleAccounts().pipe(
        toLoadState<AccountResponse[], ApiError>(),
        map((state) => {
          if (state.status === "loading") {
            return {
              accountId,
              accountState: {status: "loading"},
              totalWorkspaces: 0
            } as WorkspaceSettingsViewModel;
          }
          if (state.status === "error") {
            return {
              accountId,
              accountState: {status: "error", error: state.error},
              totalWorkspaces: 0
            } as WorkspaceSettingsViewModel;
          }

          const account = state.data.find((item) => item.id === accountId) ?? null;

          return {
            accountId,
            accountState: {status: "ready", data: account},
            totalWorkspaces: state.data.length
          } as WorkspaceSettingsViewModel;
        })
      );
    }),
    tap((vm) => {
      if (vm.accountState.status === "ready" && vm.accountState.data) {
        this.lastLoadedAccount = vm.accountState.data;

        this.form.reset({
          name: vm.accountState.data.name ?? ""
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
      }

      if (vm.accountState.status === "ready" && !vm.accountState.data) {
        this.lastLoadedAccount = null;
      }

      if (vm.accountState.status === "error") {
        this.lastLoadedAccount = null;
        this.toastService.error("Не удалось загрузить workspace.", {
          details: vm.accountState.error.details,
          correlationId: vm.accountState.error.correlationId
        });
      }
    })
  );

  canSave(accountId: number | null): boolean {
    return accountId != null && !this.saving && this.form.valid && !this.form.pristine;
  }

  save(accountId: number | null): void {
    if (!this.canSave(accountId)) {
      this.form.markAllAsTouched();
      return;
    }

    const rawName = this.form.controls.name.value;
    const name = rawName.trim();

    if (name.length === 0) {
      this.form.controls.name.setValue("");
      this.form.controls.name.markAsTouched();
      return;
    }

    const update: AccountUpdateRequest = {
      name,
      active: this.lastLoadedAccount?.active ?? true
    };

    this.saving = true;

    this.accountsApi
    .update(accountId as number, update)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Workspace обновлён.");
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error("Не удалось обновить workspace.", {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  openArchiveDialog(isCurrentlyActive: boolean): void {
    this.archiveIntent = isCurrentlyActive ? "archive" : "restore";
    this.archiveDialogVisible = true;

    if (this.archiveIntent === "archive") {
      this.archiveDialogTitle = "Archive workspace?";
      this.archiveDialogDescription = "Workspace будет скрыт и синхронизации остановятся.";
      this.archiveDialogConfirmLabel = "Archive";
      this.archiveDialogIsDanger = false;
      return;
    }

    this.archiveDialogTitle = "Restore workspace?";
    this.archiveDialogDescription = "Workspace снова станет активным и доступным для работы.";
    this.archiveDialogConfirmLabel = "Restore";
    this.archiveDialogIsDanger = false;
  }

  closeArchiveDialog(): void {
    this.archiveDialogVisible = false;
  }

  /**
   * Confirm handler без accountId в аргументах:
   * accountId берём из route/vm, а данные — из lastLoadedAccount.
   */
  confirmArchiveToggle(): void {
    const source = this.lastLoadedAccount;
    if (source == null || this.saving) {
      this.closeArchiveDialog();
      return;
    }

    const nextActive = this.archiveIntent === "restore";

    const update: AccountUpdateRequest = {
      name: source.name ?? "",
      active: nextActive
    };

    this.saving = true;

    this.accountsApi
    .update(source.id, update)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success(nextActive ? "Workspace восстановлен." : "Workspace архивирован.");
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error("Не удалось изменить статус workspace.", {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.closeArchiveDialog();
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  openDeleteDialog(): void {
    this.deleteDialogVisible = true;
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible = false;
  }

  delete(accountId: number | null): void {
    if (accountId == null || this.saving) {
      return;
    }

    this.saving = true;

    this.accountsApi
    .remove(accountId)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.toastService.success("Workspace удалён.");
        this.accountContext.clear();
        this.router.navigateByUrl(APP_PATHS.workspaces);
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error("Не удалось удалить workspace.", {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      }),
      finalize(() => {
        this.saving = false;
        this.closeDeleteDialog();
        this.cdr.markForCheck();
      })
    )
    .subscribe();
  }

  goToWorkspaces(): void {
    this.router.navigateByUrl(APP_PATHS.workspaces);
  }

  canDelete(total: number): boolean {
    return total > 1;
  }
}
