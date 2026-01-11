import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {forkJoin, of} from "rxjs";
import {catchError} from "rxjs/operators";

import {AccountMemberApi} from "../../../api/account-members/account-member.api";
import {AccountConnectionApi} from "../../../api/account-connections/account-connection.api";
import {
  AccountMember,
  AccountMemberAccessScope,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../../models/account-member.model";
import {AccountConnection} from "../../../models/account-connection.model";
import {AccountContextService} from "../../../core/account/account-context.service";
import {ApiError} from "../../../core/api/api-error.model";
import {OperatorsTableComponent} from "./operators-table.component";
import {InviteOperatorFormComponent} from "./invite-operator-form.component";
import {AccessModalComponent, AccessModalSubmit} from "./access-modal.component";

@Component({
  selector: "dp-admin-team-page",
  standalone: true,
  imports: [CommonModule, OperatorsTableComponent, InviteOperatorFormComponent, AccessModalComponent],
  templateUrl: "./admin-team-page.component.html",
  styleUrl: "./admin-team-page.component.css"
})
export class AdminTeamPageComponent implements OnInit {
  accountId: number | null = null;
  operators: AccountMember[] = [];
  connections: AccountConnection[] = [];
  loading = true;
  error: ApiError | null = null;
  actionMessage: string | null = null;

  accessModalVisible = false;
  selectedMember: AccountMember | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly accountContext: AccountContextService,
    private readonly memberApi: AccountMemberApi,
    private readonly connectionApi: AccountConnectionApi
  ) {}

  ngOnInit(): void {
    const accountId = Number(this.route.snapshot.paramMap.get("accountId"));
    this.accountId = Number.isFinite(accountId) ? accountId : null;
    if (this.accountId != null) {
      this.accountContext.setAccountId(this.accountId);
      this.loadData();
      return;
    }
    this.loading = false;
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
        catchError((error: ApiError) => {
          this.error = error;
          return of({members: [], connections: []});
        })
      )
      .subscribe(({members, connections}) => {
        this.operators = members;
        this.connections = connections;
        this.loading = false;
      });
  }

  inviteOperator(request: {
    accountId: number;
    email: string;
    role: AccountMemberRole;
    accessScope: AccountMemberAccessScope;
    connectionIds: number[];
  }): void {
    this.actionMessage = null;
    this.memberApi.create(request).subscribe({
      next: (member) => {
        this.operators = [member, ...this.operators];
        this.actionMessage = "Приглашение отправлено.";
      },
      error: (error: ApiError) => {
        this.actionMessage = error.message;
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
    this.memberApi.update(member.id, update).subscribe({
      next: (updated) => {
        this.operators = this.operators.map((item) => (item.id === updated.id ? updated : item));
      },
      error: (error: ApiError) => {
        this.operators = this.operators.map((item) => (item.id === previous.id ? previous : item));
        this.actionMessage = error.message;
      }
    });
  }
}
