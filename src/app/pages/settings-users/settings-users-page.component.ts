import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {Subject, distinctUntilChanged, forkJoin, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";

import {AccountMembersApiClient, ApiError} from "../../core/api";
import {
  AccountMember,
  AccountMemberCreateRequest,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../shared/models";
import {DashboardShellComponent, LoaderComponent, ToastService} from "../../shared/ui";
import {InviteOperatorFormComponent, OperatorsTableComponent} from "../../features/operators";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface UsersData {
  members: AccountMember[];
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
    LoaderComponent
  ],
  templateUrl: "./settings-users-page.component.html",
  styleUrl: "./settings-users-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsUsersPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberApi = inject(AccountMembersApiClient);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = this.route.paramMap.pipe(
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
          state: {status: "error", error: {status: 400, message: "Account is not selected."}}
        } as UsersViewModel);
      }
      return this.refresh$.pipe(
        startWith(void 0),
        switchMap(() =>
          forkJoin({
            members: this.memberApi.list(accountId)
          }).pipe(toLoadState<UsersData, ApiError>())
        ),
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
    const accountIdParam = this.route.snapshot.paramMap.get("accountId");
    if (accountIdParam == null) {
      return null;
    }
    const accountId = Number(accountIdParam);
    return Number.isFinite(accountId) ? accountId : null;
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    return error.message || fallback;
  }
}
