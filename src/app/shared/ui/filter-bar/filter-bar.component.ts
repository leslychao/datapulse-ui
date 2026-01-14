import {Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

import {FilterFieldVm} from "../../../vm/filter-field.vm";

@Component({
  selector: "dp-filter-bar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./filter-bar.component.html",
  styleUrl: "./filter-bar.component.css"
})
export class FilterBarComponent {
  @Input() fields: FilterFieldVm[] = [];
}
