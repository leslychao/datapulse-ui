import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {AccountConnectionSyncStatus, AccountConnectionSyncStatusType} from "../../shared/models";

@Component({
  selector: "dp-sync-status",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./sync-status.component.html",
  styleUrl: "./sync-status.component.css"
})
export class SyncStatusComponent {
  @Input() status: AccountConnectionSyncStatus | null = null;

  readonly statusLabels: Record<AccountConnectionSyncStatusType, string> = {
    [AccountConnectionSyncStatusType.Queued]: "В очереди",
    [AccountConnectionSyncStatusType.Running]: "Выполняется",
    [AccountConnectionSyncStatusType.Completed]: "Готово",
    [AccountConnectionSyncStatusType.Failed]: "Ошибка"
  };
}
