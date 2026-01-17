import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Subject, distinctUntilChanged, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";

import {AccountMembersApiClient, ApiError} from "../../core/api";
import {
  AccountMember,
  AccountMemberCreateRequest,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../shared/models";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";
import {ButtonComponent, LoaderComponent, ModalComponent, ToastService} from "../../shared/ui";
import {InviteOperatorFormComponent, OperatorsTableComponent} from "../../features/operators";

interface UsersViewModel {
  accountId: number | null;
  state: LoadState<AccountMember[], ApiError>;
}

@Component({
  selector: "dp-workspaces-users",
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    LoaderComponent,
    ModalComponent,
    InviteOperatorFormComponent,
    OperatorsTableComponent
  ],
  templateUrl: "./workspaces-users.component.html",
  styleUrl: "./workspaces-users.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacesUsersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberApi = inject(AccountMembersApiClient);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  inviteModalVisible = false;

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = (this.route.parent?.paramMap ?? this.route.paramMap).pipe(
    map((params) => {
      const accountIdParam = params.get("accountId");
      if (accountIdParam == null) {
        return null;
      }
      const accountId = Number(accountIdParam);
      return Number.isFinite(accountId) ? accountId : null;
    }),
    distinctUntilChanged()
  );

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Workspace не выбран."}}
        } as UsersViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() => this.memberApi.listMembers(accountId).pipe(toLoadState<AccountMember[], ApiError>())),
        tap((state) => {
          if (state.status === "error") {
            this.toastService.error(
              this.mapErrorMessage(state.error, "Не удалось загрузить участников."),
              {
                details: state.error.details,
                correlationId: state.error.correlationId
              }
            );
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  openInviteModal(): void {
    this.inviteModalVisible = true;
    this.cdr.markForCheck();
  }

  closeInviteModal(): void {
    this.inviteModalVisible = false;
    this.cdr.markForCheck();
  }

  inviteMember(request: AccountMemberCreateRequest): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }
    this.memberApi
      .createMember(accountId, request)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.refresh$.next();
          this.toastService.success("Приглашение отправлено.");
          this.closeInviteModal();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось пригласить участника."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  toggleBlock(member: AccountMember): void {
    const targetStatus =
      member.status === AccountMemberStatus.Inactive
        ? AccountMemberStatus.Active
        : AccountMemberStatus.Inactive;
    this.optimisticUpdate(member, {status: targetStatus, role: member.role});
  }

  changeRole(event: {member: AccountMember; role: AccountMemberRole}): void {
    this.optimisticUpdate(event.member, {role: event.role, status: event.member.status});
  }

  deleteMember(member: AccountMember): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }
    const confirmed = window.confirm("Удалить участника?");
    if (!confirmed) {
      return;
    }
    this.memberApi
      .deleteMember(accountId, member.id)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.refresh$.next();
          this.toastService.success("Участник удален.");
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить участника."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  private optimisticUpdate(member: AccountMember, update: AccountMemberUpdateRequest): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }
    this.memberApi
      .updateMember(accountId, member.id, update)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.refresh$.next();
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.refresh$.next();
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить участника."), {
            details: error.details,
            correlationId: error.correlationId
          });
          this.cdr.markForCheck();
        }
      });
  }

  private getAccountId(): number | null {
    const accountIdParam = (this.route.parent ?? this.route).snapshot.paramMap.get("accountId");
    if (accountIdParam == null) {
      return null;
    }
    const accountId = Number(accountIdParam);
    return Number.isFinite(accountId) ? accountId : null;
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    if (error.status === 403) {
      return "Недостаточно прав.";
    }
    if (error.status === 404) {
      return "Workspace не найден.";
    }
    return error.message || fallback;
  }
}
