import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";

import {AuthSessionService} from "../../core/auth";
import {APP_PATHS} from "../../core/app-paths";
import {LoaderComponent} from "../../shared/ui";

@Component({
  selector: "dp-home-redirect-page",
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: "./home-redirect-page.component.html",
  styleUrl: "./home-redirect-page.component.css"
})
export class HomeRedirectPageComponent implements OnInit {
  constructor(
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authSession.snapshot().authenticated) {
      this.router.navigateByUrl(APP_PATHS.login, {replaceUrl: true});
      return;
    }

    this.router.navigateByUrl(APP_PATHS.selectAccount, {replaceUrl: true});
  }
}
