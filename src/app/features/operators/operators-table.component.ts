import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {
  AccountMember,
  AccountMemberRole,
  AccountMemberStatus
} from "../../shared/models";
import {ButtonComponent, TableComponent} from "../../shared/ui";

@Component({
  selector: "dp-operators-table",
  standalone: true,
  imports: [CommonModule, ButtonComponent, TableComponent],
  templateUrl: "./operators-table.component.html",
  styleUrl: "./operators-table.component.css"
})
export class OperatorsTableComponent {
  @Input() operators: readonly AccountMember[] = [];

  @Output() blockToggle = new EventEmitter<AccountMember>();
  @Output() changeRole = new EventEmitter<{member: AccountMember; role: AccountMemberRole}>();
  @Output() deleteMember = new EventEmitter<AccountMember>();

  readonly roles = Object.values(AccountMemberRole);

  isBlocked(member: AccountMember): boolean {
    return member.status === AccountMemberStatus.Blocked;
  }

  onRoleSelect(member: AccountMember, value: string): void {
    const role = this.roles.find((item) => item === value);
    if (role) {
      this.changeRole.emit({member, role});
    }
  }
}
