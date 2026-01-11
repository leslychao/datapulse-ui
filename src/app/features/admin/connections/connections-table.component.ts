import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {AccountConnection} from "../../../models/account-connection.model";

@Component({
  selector: "dp-connections-table",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./connections-table.component.html",
  styleUrl: "./connections-table.component.css"
})
export class ConnectionsTableComponent {
  @Input() connections: readonly AccountConnection[] = [];

  @Output() testConnection = new EventEmitter<AccountConnection>();
  @Output() syncConnection = new EventEmitter<AccountConnection>();
  @Output() disableConnection = new EventEmitter<AccountConnection>();
}
