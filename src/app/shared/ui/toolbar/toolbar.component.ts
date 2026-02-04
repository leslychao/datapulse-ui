import {ChangeDetectionStrategy, Component} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-toolbar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./toolbar.component.html",
  styleUrl: "./toolbar.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {}
