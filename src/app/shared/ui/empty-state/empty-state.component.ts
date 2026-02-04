import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-empty-state",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./empty-state.component.html",
  styleUrl: "./empty-state.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() title = "";
  @Input() description = "";
}
