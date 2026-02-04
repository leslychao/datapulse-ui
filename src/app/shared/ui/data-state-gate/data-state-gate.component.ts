import {Component, EventEmitter, Input, Output} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";

import {DataState, DATA_STATE} from "../../../shared/models";
import {APP_PATHS} from "../../../core/app-paths";
import {ButtonComponent} from "../button/button.component";

interface DataStateCopy {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryPath?: string;
  secondaryLabel?: string;
  secondaryPath?: string;
  showRetry?: boolean;
}

@Component({
  selector: "dp-data-state-gate",
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: "./data-state-gate.component.html",
  styleUrl: "./data-state-gate.component.css"
})
export class DataStateGateComponent {
  @Input() state: DataState = DATA_STATE.unavailable;
  @Input() accountId: number | null = null;
  @Output() retry = new EventEmitter<void>();

  get copy(): DataStateCopy | null {
    const accountId = this.accountId;
    switch (this.state) {
      case DATA_STATE.notConnected:
        return {
          title: "Источник данных не подключён",
          description: "Подключите аккаунт marketplace, чтобы видеть метрики.",
          primaryLabel: "Перейти к подключениям",
          primaryPath: accountId != null ? APP_PATHS.connections(accountId) : APP_PATHS.workspaces
        };
      case DATA_STATE.noData:
        return {
          title: "Недостаточно данных для построения отчёта",
          description: "Данные ещё не загружены или период пуст.",
          primaryLabel: accountId != null ? "Перейти к подключениям" : "Выбрать workspace",
          primaryPath: accountId != null ? APP_PATHS.connections(accountId) : APP_PATHS.workspaces
        };
      case DATA_STATE.unavailable:
        return {
          title: "Раздел в разработке",
          description: "Экран готов. Данные будут подключены после появления API."
        };
      case DATA_STATE.error:
        return {
          title: "Не удалось загрузить данные",
          description: "Повторите позже или проверьте статус источника.",
          primaryLabel: "Повторить",
          showRetry: true
        };
      default:
        return null;
    }
  }

  handleRetry(): void {
    this.retry.emit();
  }
}
