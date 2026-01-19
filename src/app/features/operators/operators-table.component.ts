import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {
  AccountMember,
  AccountMemberRole,
  AccountMemberStatus,
  AccountMemberUpdateRequest
} from "../../shared/models";
import {TableComponent} from "../../shared/ui";

@Component({
  selector: "dp-operators-table",
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: "./operators-table.component.html",
  styleUrl: "./operators-table.component.css"
})
export class OperatorsTableComponent {
  @Input() operators: readonly AccountMember[] = [];

  @Output() updateMember = new EventEmitter<{member: AccountMember; update: AccountMemberUpdateRequest}>();
  @Output() deleteMember = new EventEmitter<AccountMember>();

  readonly roles = Object.values(AccountMemberRole);
  readonly statuses = Object.values(AccountMemberStatus);

  emitUpdate(
    member: AccountMember,
    role: string,
    status: string,
    menu?: HTMLDetailsElement
  ): void {
    const update: AccountMemberUpdateRequest = {
      role: role as AccountMemberRole,
      status: status as AccountMemberStatus
    };
    this.updateMember.emit({member, update});
    if (menu) {
      menu.open = false;
    }
  }
}
