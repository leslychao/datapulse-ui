import {Component} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {AppHeaderComponent, ToastContainerComponent} from "./shared/ui";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, ToastContainerComponent],
  templateUrl: "./app.component.html"
})
export class AppComponent {}
