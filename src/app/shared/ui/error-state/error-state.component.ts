import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-error-state",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./error-state.component.html",
  styleUrl: "./error-state.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent {
  @Input() title = "";
  @Input() description = "";
  @Input() details: string | null = null;
  showDetails = false;

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }
}
