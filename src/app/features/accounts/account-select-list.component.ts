import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {AccountSummary} from "../../shared/models";

@Component({
  selector: "dp-account-select-list",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./account-select-list.component.html",
  styleUrl: "./account-select-list.component.css"
})
export class AccountSelectListComponent {
  @Input() accounts: readonly AccountSummary[] = [];
  @Output() selectAccount = new EventEmitter<AccountSummary>();
}
