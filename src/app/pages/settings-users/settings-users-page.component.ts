import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Subject, distinctUntilChanged, forkJoin, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";

import {AccountConnectionsApiClient, AccountMembersApiClient, ApiError} from "../../core/api";
import {
  AccountConnection,
  AccountMember,
  AccountMemberCreateRequest,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../shared/models";
import {DashboardShellComponent, LoaderComponent, ToastService} from "../../shared/ui";
import {
  AccessModalComponent,
  AccessModalSubmit,
  InviteOperatorFormComponent,
  OperatorsTableComponent
} from "../../features/operators";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface UsersData {
  members: AccountMember[];
  connections: AccountConnection[];
}

interface UsersViewModel {
  accountId: number | null;
  state: LoadState<UsersData, ApiError>;
}

@Component({
  selector: "dp-settings-users-page",
  standalone: true,
  imports: [
    CommonModule,
    DashboardShellComponent,
    InviteOperatorFormComponent,
    OperatorsTableComponent,
    AccessModalComponent,
    LoaderComponent
  ],
  templateUrl: "./settings-users-page.component.html",
  styleUrl: "./settings-users-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsUsersPageComponent {
  accessModalVisible = false;
  selectedMember: AccountMember | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly memberApi = inject(AccountMembersApiClient);
  private readonly connectionApi = inject(AccountConnectionsApiClient);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = this.route.paramMap.pipe(
    map((params) => Number(params.get("accountId"))),
    map((accountId) => (Number.isFinite(accountId) ? accountId : null)),
    distinctUntilChanged()
  );

  readonly vm$ = this.accountId$.pipe(
    switchMap((accountId) => {
      if (accountId == null) {
        return of({
          accountId,
          state: {status: "error", error: {status: 400, message: "Account is not selected."}}
        } as UsersViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() =>
          forkJoin({
            members: this.memberApi.list(accountId),
            connections: this.connectionApi.list(accountId)
          }).pipe(toLoadState<UsersData, ApiError>())
        ),
        tap((state) => {
          if (state.status === "error") {
            this.toastService.error(this.mapErrorMessage(state.error, "Не удалось загрузить участников."));
          }
        }),
        map((state) => ({accountId, state}))
      );
    })
  );

  inviteMember(request: AccountMemberCreateRequest): void {
    const accountId = this.getAccountId();
    if (accountId == null) {
      return;
    }
    this.memberApi
      .create(accountId, request)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.refresh$.next();
          this.toastService.success("Приглашение отправлено.");
          this.cdr.markForCheck();
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось пригласить участника."));
          this.cdr.markForCheck();
        }
      });
  }

  toggleBlock(member: AccountMember): void {
    const targetStatus =
      member.status === AccountMemberStatus.Blocked
        ? AccountMemberStatus.Active
        : AccountMemberStatus.Blocked;
    this.optimisticUpdate(member, {status: targetStatus});
  }

  changeRole(event: {member: AccountMember; role: AccountMemberRole}): void {
    this.optimisticUpdate(event.member, {role: event.role});
  }

  openAccessModal(member: AccountMember): void {
    this.selectedMember = member;
    this.accessModalVisible = true;
  }

  closeAccessModal(): void {
    this.accessModalVisible = false;
    this.selectedMember = null;
  }

  saveAccess(payload: AccessModalSubmit): void {
    if (!this.selectedMember) {
      return;
    }
    const update: AccountMemberUpdateRequest = {
      accessScope: payload.accessScope,
      connectionIds: payload.connectionIds
    };
    this.optimisticUpdate(this.selectedMember, update);
    this.closeAccessModal();
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
      .remove(accountId, member.id)
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
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить участника."));
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
      .update(accountId, member.id, update)
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
        error: () => {
          this.refresh$.next();
          this.toastService.error("Не удалось обновить участника.");
          this.cdr.markForCheck();
        }
      });
  }

  private getAccountId(): number | null {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    return Number.isFinite(accountId) ? accountId : null;
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    if (error.status === 409) {
      return "Участник с таким email уже существует.";
    }
    return error.message || fallback;
  }
}
