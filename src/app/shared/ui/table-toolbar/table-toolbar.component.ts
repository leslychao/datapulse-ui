import {ChangeDetectionStrategy, Component} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-table-toolbar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./table-toolbar.component.html",
  styleUrl: "./table-toolbar.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableToolbarComponent {}
