import {Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterOutlet} from "@angular/router";
import {AppHeaderComponent, ToastContainerComponent} from "./shared/ui";
import {IamService} from "./core/state";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppHeaderComponent, ToastContainerComponent],
  templateUrl: "./app.component.html"
})
export class AppComponent {
  private readonly iamService = inject(IamService);

  readonly iamState$ = this.iamService.state$;
}
