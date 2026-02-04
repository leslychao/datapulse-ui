import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";

@Component({
  selector: "dp-page-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./page-header.component.html",
  styleUrl: "./page-header.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  @Input() title = "";
  @Input() subtitle = "";
}
