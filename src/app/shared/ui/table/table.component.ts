import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-wrap">
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: "./table.component.css"
})
export class TableComponent {}
