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
  SelectComponent,
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

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  readonly form: FormGroup<{
    name: FormControl<string>;
    description: FormControl<string>;
    active: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(64)]],
    description: [""],
    active: [true]
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
        this.form.reset({
          name: vm.accountState.data.name,
          description: vm.accountState.data.description ?? "",
          active: vm.accountState.data.active
        });
      }
      if (vm.accountState.status === "error") {
        this.toastService.error("Не удалось загрузить workspace.", {
          details: vm.accountState.error.details,
          correlationId: vm.accountState.error.correlationId
        });
      }
    })
  );

  save(accountId: number | null): void {
    if (accountId == null || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const {name, description, active} = this.form.getRawValue();
    const update: AccountUpdateRequest = {
      name: name.trim(),
      description: description.trim() || null,
      active
    };
    this.saving = true;
    this.accountsApi
      .update(accountId, update)
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

  openArchiveDialog(): void {
    this.archiveDialogVisible = true;
  }

  closeArchiveDialog(): void {
    this.archiveDialogVisible = false;
  }

  archive(accountId: number | null): void {
    if (accountId == null) {
      return;
    }
    this.form.patchValue({active: false});
    this.save(accountId);
    this.closeArchiveDialog();
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
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  goToConnections(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.connections(accountId));
  }

  goToUsers(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.users(accountId));
  }

  goToOverview(accountId: number): void {
    this.router.navigateByUrl(APP_PATHS.overview(accountId));
  }

  goToWorkspaces(): void {
    this.router.navigateByUrl(APP_PATHS.workspaces);
  }

  canDelete(total: number): boolean {
    return total > 1;
  }
}
