import {ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {forkJoin, of} from "rxjs";
import {catchError, finalize} from "rxjs/operators";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

import {AccountConnectionApi, AccountMemberApi, ApiError} from "../../core/api";
import {
  AccountMember,
  AccountMemberAccessScope,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../shared/models";
import {AccountConnection} from "../../shared/models";
import {
  AccessModalComponent,
  AccessModalSubmit,
  InviteOperatorFormComponent,
  OperatorsTableComponent
} from "../../features/operators";
import {LoaderComponent, ToastService} from "../../shared/ui";
import {APP_PATHS} from "../../core/app-paths";

@Component({
  selector: "dp-admin-operators-page",
  standalone: true,
  imports: [
    CommonModule,
    OperatorsTableComponent,
    InviteOperatorFormComponent,
    AccessModalComponent,
    LoaderComponent
  ],
  templateUrl: "./admin-operators-page.component.html",
  styleUrl: "./admin-operators-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOperatorsPageComponent implements OnInit {
  accountId: number | null = null;
  operators: AccountMember[] = [];
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;

  accessModalVisible = false;
  selectedMember: AccountMember | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly memberApi: AccountMemberApi,
    private readonly connectionApi: AccountConnectionApi,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.accountId = this.readAccountId();
    if (this.accountId == null) {
      this.loading = false;
      this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
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
          return of({members: [], connections: []});
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(({members, connections}) => {
        this.operators = members;
        this.connections = connections;
      });
  }

  inviteOperator(request: {
    accountId: number;
    email: string;
    role: AccountMemberRole;
    accessScope: AccountMemberAccessScope;
    connectionIds: number[];
  }): void {
    this.memberApi
      .create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (member) => {
          this.operators = [member, ...this.operators];
          this.toastService.success("Приглашение отправлено.");
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

  private optimisticUpdate(member: AccountMember, update: AccountMemberUpdateRequest): void {
    const previous = {...member};
    this.operators = this.operators.map((item) =>
      item.id === member.id ? {...item, ...update} : item
    );
    this.memberApi
      .update(member.id, update)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.operators = this.operators.map((item) => (item.id === updated.id ? updated : item));
        },
        error: () => {
          this.operators = this.operators.map((item) => (item.id === previous.id ? previous : item));
        }
      });
  }

  private readAccountId(): number | null {
    const raw = localStorage.getItem("datapulse.accountId");
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
