import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

import {DataState} from "../../../shared/models";
import {DataStateGateComponent} from "../data-state-gate/data-state-gate.component";

@Component({
  selector: "dp-chart-card",
  standalone: true,
  imports: [CommonModule, DataStateGateComponent],
  templateUrl: "./chart-card.component.html",
  styleUrl: "./chart-card.component.css"
})
export class ChartCardComponent {
  @Input() title = "";
  @Input() subtitle = "";
  @Input() state: DataState = "UNAVAILABLE";
  @Input() accountId: number | null = null;
}
