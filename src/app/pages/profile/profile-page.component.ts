import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";

import {AuthUserService} from "../../core/auth";
import {LoadingStateComponent, PageHeaderComponent, PageLayoutComponent} from "../../shared/ui";

@Component({
  selector: "dp-profile-page",
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, PageHeaderComponent, LoadingStateComponent],
  templateUrl: "./profile-page.component.html",
  styleUrl: "./profile-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  private readonly authUser = inject(AuthUserService);

  readonly profile$ = this.authUser.userProfile$;

  getInitial(profile: {fullName?: string | null; username?: string | null; email?: string | null}): string {
    const source = profile.fullName || profile.username || profile.email || "U";
    return source.trim().charAt(0).toUpperCase() || "U";
  }
}
