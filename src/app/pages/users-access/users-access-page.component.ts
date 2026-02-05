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
import {FormBuilder, FormControl, ReactiveFormsModule} from "@angular/forms";
import {Observable, Subject, combineLatest, map, of, switchMap} from "rxjs";
import {finalize, startWith, tap} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountMembersApiClient, ApiError} from "../../core/api";
import {AuthUserService} from "../../core/auth";
import {
  AccountMember,
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
  TableComponent,
  TableToolbarComponent,
  ToastService
} from "../../shared/ui";

import {LoadState, toLoadState} from "../../shared/operators/to-load-state";

interface UsersViewModel {
  accountId: number | null;
  state: LoadState<AccountMember[], ApiError>;
  currentUserId: number | null;
}

type UiSummary = {
  total: number;
  active: number;
  inactive: number;
};

type UsersAccessUi = {
  members: readonly AccountMember[];
  filtered: readonly AccountMember[];
  summary: UiSummary;
  canManage: boolean;
  menuDisabled: boolean;
};

type StatusOption = {label: string; value: AccountMemberStatus};

const EMPTY_MEMBERS: readonly AccountMember[] = [];

@Component({
  selector: "dp-users-access-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    TableComponent,
    TableToolbarComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    FormFieldComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ConfirmDialogComponent
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

  saving = false;

  confirmDialogVisible = false;
  confirmAction: "role" | "remove" | "activate" | "deactivate" | null = null;
  selectedMember: AccountMember | null = null;
  pendingRole: AccountMemberRole | null = null;

  readonly statusOptions: readonly StatusOption[] = [
    {label: "Active", value: AccountMemberStatus.Active},
    {label: "Inactive", value: AccountMemberStatus.Inactive}
  ];

  readonly roleOptions: readonly AccountMemberRole[] = Object.values(AccountMemberRole);

  readonly filterStatusControl = this.fb.nonNullable.control<string>("");
  readonly searchControl = this.fb.nonNullable.control<string>("");

  private readonly refresh$ = new Subject<void>();
  private readonly accountId$ = accountIdFromRoute(this.route);

  private membersSnapshot: readonly AccountMember[] = EMPTY_MEMBERS;
  private openMenuMemberId: number | null = null;

  private readonly uiCache = new WeakMap<object, UsersAccessUi>();
  private uiCacheVersion = 0;

  readonly vm$: Observable<UsersViewModel> = combineLatest({
    accountId: this.accountId$,
    refresh: this.refresh$.pipe(startWith(void 0)),
    currentUser: this.authUser.me$.pipe(startWith(null)),
    filterStatus: this.filterStatusControl.valueChanges.pipe(startWith(this.filterStatusControl.value)),
    search: this.searchControl.valueChanges.pipe(startWith(this.searchControl.value))
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
      this.uiCacheVersion++;

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

  // ===== TrackBy =====

  trackByMemberId(_: number, member: AccountMember): number {
    return member.id ?? 0;
  }

  trackByRoleValue(_: number, role: AccountMemberRole): AccountMemberRole {
    return role;
  }

  trackByStatusOptionValue(_: number, option: StatusOption): AccountMemberStatus {
    return option.value;
  }

  // ===== Display helpers =====

  displayName(member: AccountMember): string {
    return member.userId != null ? `User #${member.userId}` : "User";
  }

  // ===== LoadState helpers =====

  loadStateErrorMessage(state: LoadState<AccountMember[], ApiError>): string {
    if (state.status !== "error") {
      return "Неизвестная ошибка.";
    }
    return state.error.message || "Не удалось загрузить пользователей.";
  }

  // ===== UI projection (heavy logic out of template) =====

  vmUi(vm: UsersViewModel): UsersAccessUi {
    const members = vm.state.status === "ready" ? vm.state.data : EMPTY_MEMBERS;

    const cacheKey = this.buildUiCacheKey(members);
    const cached = this.uiCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const current = this.currentMember(members, vm.currentUserId);
    const canManage = this.canManageUsers(current?.role ?? null);

    const filtered = this.filteredMembers(members);

    const summary: UiSummary = {
      total: members.length,
      active: this.countByStatus(members, AccountMemberStatus.Active),
      inactive: this.countByStatus(members, AccountMemberStatus.Inactive)
    };

    const ui: UsersAccessUi = {
      members,
      filtered,
      summary,
      canManage,
      menuDisabled: !canManage
    };

    this.uiCache.set(cacheKey, ui);
    return ui;
  }

  private buildUiCacheKey(members: readonly AccountMember[]): object {
    return {members, v: this.uiCacheVersion};
  }

  // ===== Menu =====

  @HostListener("document:click")
  onDocumentClick(): void {
    this.openMenuMemberId = null;
    this.cdr.markForCheck();
  }

  toggleMenu(member: AccountMember): void {
    this.openMenuMemberId = this.openMenuMemberId === member.id ? null : member.id;
    this.cdr.markForCheck();
  }

  isMenuOpenFor(member: AccountMember): boolean {
    return this.openMenuMemberId === member.id;
  }

  // ===== Actions =====

  refresh(): void {
    this.refresh$.next();
  }

  // ===== Filtering / permissions / invariants =====

  filteredMembers(members: readonly AccountMember[]): AccountMember[] {
    const statusRaw = this.filterStatusControl.value;
    const status = this.parseStatus(statusRaw);
    const search = this.searchControl.value.trim().toLowerCase();

    return members.filter((member) => {
      if (status && member.status !== status) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = `${member.userId ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  private parseStatus(raw: string): AccountMemberStatus | null {
    if (!raw) {
      return null;
    }
    const values = Object.values(AccountMemberStatus) as readonly string[];
    return values.includes(raw) ? (raw as AccountMemberStatus) : null;
  }

  currentMember(members: readonly AccountMember[], currentUserId: number | null): AccountMember | null {
    if (currentUserId == null) {
      return null;
    }
    return members.find((member) => member.userId === currentUserId) ?? null;
  }

  canManageUsers(currentRole: AccountMemberRole | null): boolean {
    return currentRole === AccountMemberRole.Owner || currentRole === AccountMemberRole.Admin;
  }

  ownersCount(members: readonly AccountMember[]): number {
    return members.filter(
      (member) => member.role === AccountMemberRole.Owner && member.status === AccountMemberStatus.Active
    ).length;
  }

  isLastOwner(member: AccountMember, members: readonly AccountMember[]): boolean {
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

  countByStatus(members: readonly AccountMember[], status: AccountMemberStatus): number {
    return members.filter((member) => member.status === status).length;
  }

  // ===== Role change =====

  onRoleSelectChange(member: AccountMember, event: Event): void {
    const rawValue = this.extractValueFromEvent(event);
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

  private extractValueFromEvent(event: Event): string | null {
    const maybeTarget = event.target as {value?: unknown} | null;
    const value = maybeTarget?.value;
    return typeof value === "string" ? value : null;
  }

  private parseRole(value: string): AccountMemberRole | null {
    return this.roleOptions.includes(value as AccountMemberRole) ? (value as AccountMemberRole) : null;
  }

  openRoleConfirm(member: AccountMember, role: AccountMemberRole): void {
    if (role === member.role || member.role == null || member.status == null) {
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
    this.cdr.markForCheck();
  }

  confirmRoleChange(accountId: number | null): void {
    if (!this.selectedMember || !this.pendingRole || accountId == null) {
      return;
    }
    if (this.selectedMember.status == null) {
      return;
    }
    this.updateMember(accountId, this.selectedMember, {role: this.pendingRole, status: this.selectedMember.status});
    this.closeConfirm();
  }

  // ===== Menu actions =====

  requestRemove(member: AccountMember): void {
    if (this.isLastOwner(member, this.latestMembersSnapshot())) {
      this.toastService.error("Нельзя удалить последнего OWNER.");
      return;
    }
    this.selectedMember = member;
    this.confirmAction = "remove";
    this.confirmDialogVisible = true;
    this.cdr.markForCheck();
  }

  requestDeactivate(member: AccountMember): void {
    if (this.isLastOwner(member, this.latestMembersSnapshot())) {
      this.toastService.error("Нельзя деактивировать последнего OWNER.");
      return;
    }
    this.selectedMember = member;
    this.confirmAction = "deactivate";
    this.confirmDialogVisible = true;
    this.cdr.markForCheck();
  }

  requestActivate(member: AccountMember): void {
    this.selectedMember = member;
    this.confirmAction = "activate";
    this.confirmDialogVisible = true;
    this.cdr.markForCheck();
  }

  deactivateDisabled(member: AccountMember, members: readonly AccountMember[], currentUserId: number | null): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    if (member.status == null) {
      return true;
    }
    if (member.status === AccountMemberStatus.Inactive) {
      return true;
    }
    return this.isLastOwner(member, members);
  }

  activateDisabled(member: AccountMember, currentUserId: number | null, members: readonly AccountMember[]): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    if (member.status == null) {
      return true;
    }
    return member.status !== AccountMemberStatus.Inactive;
  }

  removeDisabled(member: AccountMember, members: readonly AccountMember[], currentUserId: number | null): boolean {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return true;
    }
    if (member.role == null || member.status == null) {
      return true;
    }
    return this.isLastOwner(member, members);
  }

  menuHint(member: AccountMember, members: readonly AccountMember[], currentUserId: number | null): string | null {
    if (!this.canManageUsers(this.currentMember(members, currentUserId)?.role ?? null)) {
      return "Недостаточно прав для управления пользователями.";
    }
    if (this.isLastOwner(member, members)) {
      return "В workspace должен оставаться минимум один OWNER.";
    }
    return null;
  }

  onMenuDeactivate(member: AccountMember, accountId: number | null, members: readonly AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.deactivateDisabled(member, members, currentUserId)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestDeactivate(member);
  }

  onMenuActivate(member: AccountMember, accountId: number | null, members: readonly AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.activateDisabled(member, currentUserId, members)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestActivate(member);
  }

  onMenuRemove(member: AccountMember, accountId: number | null, members: readonly AccountMember[], currentUserId: number | null): void {
    if (accountId == null || this.removeDisabled(member, members, currentUserId)) {
      return;
    }
    this.openMenuMemberId = null;
    this.requestRemove(member);
  }

  // ===== Confirm dialog =====

  closeConfirm(): void {
    this.confirmDialogVisible = false;
    this.confirmAction = null;
    this.selectedMember = null;
    this.pendingRole = null;
    this.cdr.markForCheck();
  }

  confirmActionRun(accountId: number | null): void {
    if (!this.selectedMember || accountId == null) {
      return;
    }

    if (this.confirmAction === "remove") {
      this.removeMember(accountId, this.selectedMember);
    }

    if (this.confirmAction === "deactivate") {
      if (this.selectedMember.role == null) {
        return;
      }
      this.updateMember(accountId, this.selectedMember, {
        role: this.selectedMember.role,
        status: AccountMemberStatus.Inactive
      });
    }

    if (this.confirmAction === "activate") {
      if (this.selectedMember.role == null) {
        return;
      }
      this.updateMember(accountId, this.selectedMember, {
        role: this.selectedMember.role,
        status: AccountMemberStatus.Active
      });
    }

    this.closeConfirm();
  }

  // ===== API calls =====

  private latestMembersSnapshot(): readonly AccountMember[] {
    return this.membersSnapshot;
  }

  updateMember(accountId: number, member: AccountMember, update: {role: AccountMemberRole; status: AccountMemberStatus}): void {
    if (this.saving || member.id == null) {
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
    if (this.saving || member.id == null) {
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

  // ===== Texts =====

  confirmTitle(): string {
    if (this.confirmAction === "role") return "Change role?";
    if (this.confirmAction === "remove") return "Remove user?";
    if (this.confirmAction === "deactivate") return "Deactivate user?";
    if (this.confirmAction === "activate") return "Activate user?";
    return "Confirm action";
  }

  confirmDescription(currentUserId: number | null): string {
    if (this.confirmAction === "remove") {
      return this.isSelf(this.selectedMember, currentUserId)
        ? "Вы потеряете доступ к workspace."
        : "Пользователь потеряет доступ к workspace.";
    }
    if (this.confirmAction === "deactivate") return "Доступ пользователя будет отключен.";
    if (this.confirmAction === "activate") return "Доступ пользователя будет восстановлен.";
    if (this.confirmAction === "role") return "Роль пользователя будет изменена.";
    return "";
  }

  mapErrorMessage(error: ApiError, fallback: string): string {
    return error.message || fallback;
  }

  statusLabel(status: AccountMemberStatus | undefined): string {
    switch (status) {
      case AccountMemberStatus.Active:
        return "Active";
      case AccountMemberStatus.Inactive:
        return "Inactive";
      default:
        return `${status}`;
    }
  }
}
