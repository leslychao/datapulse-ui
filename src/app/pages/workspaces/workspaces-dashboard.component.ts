import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {map} from "rxjs";
import {finalize} from "rxjs/operators";

import {AccountMembersApiClient, ApiError} from "../../core/api";
import {APP_PATHS} from "../../core/app-paths";
import {AccountCatalogService} from "../../core/state";
import {AccountMemberCreateRequest, AccountSummary} from "../../shared/models";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";
import {ButtonComponent, LoaderComponent, ModalComponent, ToastService} from "../../shared/ui";
import {InviteOperatorFormComponent} from "../../features/operators";

interface DashboardViewModel {
  accounts: AccountSummary[];
  state: LoadState<AccountSummary[], ApiError>;
}

@Component({
  selector: "dp-workspaces-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonComponent,
    LoaderComponent,
    ModalComponent,
    InviteOperatorFormComponent
  ],
  templateUrl: "./workspaces-dashboard.component.html",
  styleUrl: "./workspaces-dashboard.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacesDashboardComponent {
  private readonly accountCatalog = inject(AccountCatalogService);
  private readonly memberApi = inject(AccountMembersApiClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  inviteModalVisible = false;
  saving = false;

  readonly inviteForm: FormGroup<{
    accountId: FormControl<string>;
  }> = this.fb.nonNullable.group({
    accountId: ["", Validators.required]
  });

  readonly vm$ = this.accountCatalog.load().pipe(
    toLoadState<AccountSummary[], ApiError>(),
    map((state) => ({
      state,
      accounts: state.status === "ready" ? state.data : []
    }))
  );

  openInviteModal(): void {
    this.inviteForm.reset({accountId: ""});
    this.inviteModalVisible = true;
    this.cdr.markForCheck();
  }

  closeInviteModal(): void {
    this.inviteModalVisible = false;
    this.inviteForm.reset({accountId: ""});
    this.cdr.markForCheck();
  }

  inviteMember(request: AccountMemberCreateRequest): void {
    if (this.saving) {
      return;
    }
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      this.toastService.error("Выберите workspace.");
      return;
    }
    const accountId = Number(this.inviteForm.controls.accountId.value);
    if (!Number.isFinite(accountId)) {
      this.toastService.error("Выберите workspace.");
      return;
    }
    this.saving = true;
    this.memberApi
      .createMember(accountId, request)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success("Пользователь добавлен в workspace.");
          this.closeInviteModal();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось добавить участника."), {
            details: error.details,
            correlationId: error.correlationId
          });
        }
      });
  }

  trackByAccountId = (_: number, account: AccountSummary): number => account.id;

  private mapErrorMessage(error: ApiError, fallback: string): string {
    if (error.status === 403) {
      return "Недостаточно прав.";
    }
    if (error.status === 404) {
      return "Workspace не найден.";
    }
    return error.message || fallback;
  }

  readonly APP_PATHS = APP_PATHS;
}
