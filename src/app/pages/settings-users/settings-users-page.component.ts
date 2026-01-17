import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {forkJoin, of} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {catchError, finalize} from "rxjs/operators";

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
export class SettingsUsersPageComponent implements OnInit {
  accountId: number | null = null;
  members: AccountMember[] = [];
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;

  accessModalVisible = false;
  selectedMember: AccountMember | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly memberApi: AccountMembersApiClient,
    private readonly connectionApi: AccountConnectionsApiClient,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId == null) {
      this.loading = false;
      this.error = {status: 400, message: "Account is not selected."};
      return;
    }
    this.loadData();
  }

  loadData(): void {
    if (this.accountId == null) {
      return;
    }
    this.loading = true;
    this.error = null;
    forkJoin({
      members: this.memberApi.list(this.accountId),
      connections: this.connectionApi.list(this.accountId)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: ApiError) => {
          this.error = error;
          this.toastService.error(this.mapErrorMessage(error, "Не удалось загрузить участников."));
          return of({members: [], connections: []});
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(({members, connections}) => {
        this.members = members;
        this.connections = connections;
      });
  }

  inviteMember(request: AccountMemberCreateRequest): void {
    if (this.accountId == null) {
      return;
    }
    this.memberApi
      .create(this.accountId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (member) => {
          this.members = [member, ...this.members];
          this.toastService.success("Приглашение отправлено.");
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось пригласить участника."));
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
    if (this.accountId == null) {
      return;
    }
    const confirmed = window.confirm("Удалить участника?");
    if (!confirmed) {
      return;
    }
    this.memberApi
      .remove(this.accountId, member.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.members = this.members.filter((item) => item.id !== member.id);
          this.toastService.success("Участник удален.");
        },
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить участника."));
        }
      });
  }

  private optimisticUpdate(member: AccountMember, update: AccountMemberUpdateRequest): void {
    if (this.accountId == null) {
      return;
    }
    const previous = {...member};
    this.members = this.members.map((item) =>
      item.id === member.id ? {...item, ...update} : item
    );
    this.memberApi
      .update(this.accountId, member.id, update)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.members = this.members.map((item) => (item.id === updated.id ? updated : item));
        },
        error: () => {
          this.members = this.members.map((item) => (item.id === previous.id ? previous : item));
          this.toastService.error("Не удалось обновить участника.");
        }
      });
  }

  private mapErrorMessage(error: ApiError, fallback: string): string {
    if (error.status === 409) {
      return "Участник с таким email уже существует.";
    }
    return error.message || fallback;
  }
}
