import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {LoaderComponent} from "../loader/loader.component";

@Component({
  selector: "dp-loading-state",
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: "./loading-state.component.html",
  styleUrl: "./loading-state.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  @Input() label = "Loading";
}
