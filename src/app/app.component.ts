import {Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterOutlet} from "@angular/router";

import {IamService} from "./core/state";
import {LastVisitedPathService} from "./core/routing/last-visited-path.service";
import {AppHeaderComponent} from "./shared/ui/app-header/app-header.component";
import {BreadcrumbBarComponent, ToastContainerComponent} from "./shared/ui";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AppHeaderComponent,
    BreadcrumbBarComponent,
    ToastContainerComponent
  ],
  templateUrl: "./app.component.html"
})
export class AppComponent {
  private readonly iamService = inject(IamService);
  private readonly lastVisitedPathService = inject(LastVisitedPathService);

  readonly iamState$ = this.iamService.state$;
}
