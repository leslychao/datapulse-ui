import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {AccountConnection} from "../../shared/models";
import {TableComponent} from "../../shared/ui";

@Component({
  selector: "dp-connections-table",
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: "./connections-table.component.html",
  styleUrl: "./connections-table.component.css"
})
export class ConnectionsTableComponent {
  @Input() connections: readonly AccountConnection[] = [];

  @Output() editConnection = new EventEmitter<AccountConnection>();
  @Output() deleteConnection = new EventEmitter<AccountConnection>();
}
