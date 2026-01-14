import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

import {DataState, DATA_STATE} from "../../../shared/models";
import {MetricTileVm} from "../../../vm/metric-tile.vm";

@Component({
  selector: "dp-metric-tile-group",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./metric-tile-group.component.html",
  styleUrl: "./metric-tile-group.component.css"
})
export class MetricTileGroupComponent {
  @Input() tiles: MetricTileVm[] = [];
  @Input() state: DataState = DATA_STATE.unavailable;

  get isReady(): boolean {
    return this.state === DATA_STATE.ready;
  }

  getTileClass(tile: MetricTileVm): Record<string, boolean> {
    return {
      "metric-tile": true,
      "is-profit": tile.semantic === "profit",
      "is-loss": tile.semantic === "loss"
    };
  }
}
