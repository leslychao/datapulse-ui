import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject
} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {FormBuilder, ReactiveFormsModule} from "@angular/forms";
import {Observable, Subject, combineLatest, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountMembersApiClient, ApiError} from "../../core/api";
import {AuthUserService} from "../../core/auth";
import {
  AccountMember,
  AccountMemberCreateRequest,
  AccountMemberRole,
  AccountMemberStatus
} from "../../shared/models";
import {accountIdFromRoute} from "../../core/routing/account-id.util";
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
  SelectComponent,
  ToastService
} from "../../shared/ui";
import {InviteMemberModalComponent, InviteMemberPayload} from "../../features/members";
import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface UsersViewModel {
  accountId: number | null;
  state: LoadState<AccountMember[], ApiError>;
  currentUserId: number | null;
}

@Component({
  selector: "dp-users-access-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormFieldComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ConfirmDialogComponent,
    InviteMemberModalComponent
  ],
  templateUrl: "./users-access-page.component.html",
  styleUrl: "./users-access-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersAccessPageComponent {
  readonly statusEnum = AccountMemberStatus;

  private readonly route = inject(ActivatedRoute);
  private readonly membersApi = inject(AccountMembersApiClient);
  private readonly authUser = inject(AuthUserService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  inviteVisible = false;
  saving = false;

  confirmDialogVisible = false;
  confirmAction: "role" | "remove" | "deactivate" | "activate" | null = null;
  selectedMember: AccountMember | null = null;
  pendingRole: AccountMemberRole | null = null;

  readonly statusOptions = [
    {label: "Active", value: AccountMemberStatus.Active},
    {label: "Inactive", value: AccountMemberStatus.Inactive}
  ];

  readonly roleOptions = Object.values(AccountMemberRole);

  readonly filterStatusControl = this.fb.nonNullable.control("");
  readonly searchControl = this.fb.nonNullable.control("");

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);
  private membersSnapshot: AccountMember[] = [];

  private openMenuMemberId: number | null = null;

  readonly vm$: Observable<UsersViewModel> = combineLatest({
    accountId: this.accountId$,
    refresh: this.refresh$.pipe(startWith(void 0)),
    currentUser: this.authUser.me$.pipe(startWith(null))
  }).pipe(
    switchMap(({accountId, currentUser}) => {
      if (accountId == null) {
        return of({
          accountId,
          currentUserId: currentUser?.id ?? null,
          state: {status: "error", error: {status: 400, message: "Workspace is not selected."}}
        } as UsersViewModel);
      }
      return this.membersApi.list(accountId).pipe(
        toLoadState<AccountMember[], ApiError>(),
        map((state) => ({
          accountId,
          currentUserId: currentUser?.id ?? null,
          state
        }))
      );
    }),
    tap((vm) => {
      if (vm.state.status === "error") {
        this.toastService.error(
          this.mapErrorMessage(vm.state.error, "Не удалось загрузить участников."),
          {details: vm.state.error.details, correlationId: vm.state.error.correlationId}
        );
      }
      if (vm.state.status === "ready") {
        this.membersSnapshot = vm.state.data;
      }
    })
  );

  @HostListener("document:click")
  onDocumentClick(): void {
    this.openMenuMemberId = null;
    this.cdr.markForCheck();
  }

  refresh(): void {
    this.refresh$.next();
  }

  openInvite(): void {
    this.inviteVisible = true;
  }

  closeInvite(): void {
    if (this.saving) {
      return;
    }
    this.inviteVisible = false;
  }

  submitInvite(accountId: number | null, payload: InviteMemberPayload): void {
    if (accountId == null || this.saving) {
      return;
    }

    const request: AccountMemberCreateRequest = {
      email: payload.email,
      role: payload.role,
      status: AccountMemberStatus.Active
    };

    this.saving = true;
    this.membersApi
    .create(accountId, request)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.refresh$.next();
        this.inviteVisible = false;
        this.toastService.success("User added.");
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось добавить пользователя."), {
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

  filteredMembers(members: AccountMember[]): AccountMember[] {
    const status = this.filterStatusControl.value;
    const search = this.searchControl.value.trim().toLowerCase();

    return members.filter((member) => {
      if (status && member.status !== status) {
        return false;
      }
      if (!search) {
        return true;
      }

      const haystack = `${member.fullName ?? ""} ${member.email ?? ""} ${member.username ?? ""} ${member.userId}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  displayName(member: AccountMember): string {
    return member.fullName || member.email || (member.username ? "@" + member.username : null) || ("User #" + member.userId);
  }

  currentMember(members: AccountMember[], currentUserId: number | null): AccountMember | null {
    if (currentUserId == null) {
      return null;
    }
    return members.find((member) => member.userId === currentUserId) ?? null;
  }

  canManageUsers(currentRole: AccountMemberRole | null): boolean {
    return currentRole === AccountMemberRole.Owner || currentRole === AccountMemberRole.Admin;
  }

  ownersCount(members: AccountMember[]): number {
    return members.filter((member) => member.role === AccountMemberRole.Owner && member.status === AccountMemberStatus.Active).length;
  }

  isLastOwner(member: AccountMember, members: AccountMember[]): boolean {
    return (
      member.role === AccountMemberRole.Owner &&
      member.status === AccountMemberStatus.Active &&
      this.ownersCount(members) <= 1
    );
  }

  isSelf(member: AccountMember | null, currentUserId: number | null): boolean {
    if (!member || currentUserId == null) {
      return false;
    }
    return member.userId === currentUserId;
  }

  countByStatus(members: AccountMember[], status: AccountMemberStatus): number {
    return members.filter((member) => member.status === status).length;
  }

  onRoleSelectChange(member: AccountMember, event: Event): void {
    const selectElement = event.target as HTMLSelectElement | null;
    const rawValue = selectElement?.value ?? null;
    if (!rawValue) {
      return;
    }
    const role = this.parseRole(rawValue);
    if (role == null) {
      this.toastService.error("Некорректная роль.");
      return;
    }
    this.openRoleConfirm(member, role);
  }

  private parseRole(value: string): AccountMemberRole | null {
    return this.roleOptions.includes(value as AccountMemberRole) ? (value as AccountMemberRole) : null;
  }

  openRoleConfirm(member: AccountMember, role: AccountMemberRole): void {
    if (role === member.role) {
      return;
    }
    if (this.isLastOwner(member, this.latestMembersSnapshot())) {
      this.toastService.error("Нельзя понизить последнего OWNER.");
      return;
    }
    this.selectedMember = member;
    this.pendingRole = role;
    this.confirmAction = "role";
    this.confirmDialogVisible = true;
  }

  confirmRoleChange(accountId: number | null): void {
    if (!this.selectedMember || !this.pendingRole || accountId == null) {
      return;
    }
    this.updateMember(accountId, this.selectedMember, {role: this.pendingRole, status: this.selectedMember.status});
    this.closeConfirm();
  }

  requestRemove(member: AccountMember): void {
    if (this.isLastOwner(member, this.latestMembersSnapshot())) {
      this.toastService.error("Нельзя удалить последнего OWNER.");
      return;
    }
    this.selectedMember = member;
    this.confirmAction = "remove";
    this.confirmDialogVisible = true;
  }

  requestDeactivate(member: AccountMember): void {
    if (this.isLastOwner(member, this.latestMembersSnapshot())) {
      this.toastService.error("Нельзя деактивировать последнего OWNER.");
      return;
    }
    this.selectedMember = member;
    this.confirmAction = "deactivate";
    this.confirmDialogVisible = true;
  }

  requestActivate(member: AccountMember): void {
    this.selectedMember = member;
    this.confirmAction = "activate";
    this.confirmDialogVisible = true;
  }

  toggleMenu(member: AccountMember): void {
    this.openMenuMemberId = this.openMenuMemberId === member.id ? null : member.id;
    this.cdr.markForCheck();
  }

  isMenuOpenFor(member: AccountMember): boolean {
    return this.openMenuMemberId === member.id;
  }

  menuDisabled(members: AccountMember[], currentUserId: number | null): boolean {
    return !this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null);
  }

  deactivateDisabled(member: AccountMember, members: AccountMember[], currentUserId: number | null): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    if (member.status === AccountMemberStatus.Inactive) {
      return true;
    }
    return this.isLastOwner(member, members);
  }

  activateDisabled(member: AccountMember, currentUserId: number | null, members: AccountMember[]): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    return member.status !== AccountMemberStatus.Inactive;
  }

  removeDisabled(member: AccountMember, members: AccountMember[], currentUserId: number | null): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    return this.isLastOwner(member, members);
  }

  menuHint(member: AccountMember, members: AccountMember[], currentUserId: number | null): string | null {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return "Недостаточно прав для управления пользователями.";
    }
    if (this.isLastOwner(member, members)) {
      return "В workspace должен оставаться минимум один OWNER.";
    }
    return null;
  }

  onMenuDeactivate(member: AccountMember, accountId: number | null, members: AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.deactivateDisabled(member, members, currentUserId)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestDeactivate(member);
  }

  onMenuActivate(member: AccountMember, accountId: number | null, members: AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.activateDisabled(member, currentUserId, members)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestActivate(member);
  }

  onMenuRemove(member: AccountMember, accountId: number | null, members: AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.removeDisabled(member, members, currentUserId)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestRemove(member);
  }

  closeConfirm(): void {
    this.confirmDialogVisible = false;
    this.confirmAction = null;
    this.selectedMember = null;
    this.pendingRole = null;
  }

  confirmActionRun(accountId: number | null): void {
    if (!this.selectedMember || accountId == null) {
      return;
    }

    if (this.confirmAction === "remove") {
      this.removeMember(accountId, this.selectedMember);
    }

    if (this.confirmAction === "deactivate") {
      this.updateMember(accountId, this.selectedMember, {
        role: this.selectedMember.role,
        status: AccountMemberStatus.Inactive
      });
    }

    if (this.confirmAction === "activate") {
      this.updateMember(accountId, this.selectedMember, {
        role: this.selectedMember.role,
        status: AccountMemberStatus.Active
      });
    }

    this.closeConfirm();
  }

  private latestMembersSnapshot(): AccountMember[] {
    return this.membersSnapshot;
  }

  updateMember(accountId: number, member: AccountMember, update: {role: AccountMemberRole; status: AccountMemberStatus}): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.membersApi
    .update(accountId, member.id, update)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.refresh$.next();
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось обновить участника."), {
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

  removeMember(accountId: number, member: AccountMember): void {
    if (this.saving) {
      return;
    }
    this.saving = true;
    this.membersApi
    .remove(accountId, member.id)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => {
        this.refresh$.next();
        this.toastService.success("Участник удален.");
      }),
      tap({
        error: (error: ApiError) => {
          this.toastService.error(this.mapErrorMessage(error, "Не удалось удалить участника."), {
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

  confirmTitle(): string {
    if (this.confirmAction === "role") {
      return "Change role?";
    }
    if (this.confirmAction === "remove") {
      return "Remove user?";
    }
    if (this.confirmAction === "deactivate") {
      return "Deactivate user?";
    }
    if (this.confirmAction === "activate") {
      return "Activate user?";
    }
    return "Confirm action";
  }

  confirmDescription(currentUserId: number | null): string {
    if (this.confirmAction === "remove") {
      return this.isSelf(this.selectedMember, currentUserId)
        ? "Вы потеряете доступ к workspace."
        : "Пользователь потеряет доступ к workspace.";
    }
    if (this.confirmAction === "deactivate") {
      return "Пользователь станет неактивным в этом workspace.";
    }
    if (this.confirmAction === "activate") {
      return "Пользователь снова станет активным в этом workspace.";
    }
    if (this.confirmAction === "role") {
      return "Роль пользователя будет изменена.";
    }
    return "";
  }

  mapErrorMessage(error: ApiError, fallback: string): string {
    return error.message || fallback;
  }

  statusLabel(status: AccountMemberStatus): string {
    switch (status) {
      case AccountMemberStatus.Active:
        return "Active";
      case AccountMemberStatus.Inactive:
        return "Inactive";
      default:
        return status;
    }
  }

  memberInitials(member: AccountMember): string {
    const candidate = (member.fullName || member.email || member.username || ("User " + member.userId)).trim();
    if (!candidate) {
      return "U";
    }

    const words = candidate.split(/\s+/).filter(Boolean);
    const first = words[0] ?? "";
    const second = words.length > 1 ? words[1] ?? "" : "";

    const firstLetter = first.charAt(0);
    const secondLetter = second ? second.charAt(0) : first.charAt(1);

    const initials = (firstLetter + (secondLetter || "")).toUpperCase();
    return initials || "U";
  }
}
