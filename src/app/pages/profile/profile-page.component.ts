import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule, Location} from "@angular/common";

import {AuthUserService} from "../../core/auth";
import {LoadingStateComponent, PageHeaderComponent, PageLayoutComponent} from "../../shared/ui";
import {ButtonComponent} from "../../shared/ui/button/button.component";

@Component({
  selector: "dp-profile-page",
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, PageHeaderComponent, LoadingStateComponent, ButtonComponent],
  templateUrl: "./profile-page.component.html",
  styleUrl: "./profile-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  private readonly authUser = inject(AuthUserService);
  private readonly location = inject(Location);

  readonly profile$ = this.authUser.userProfile$;

  goBack(): void {
    this.location.back();
  }

  getInitial(profile: {fullName?: string | null; username?: string | null; email?: string | null}): string {
    const source = profile.fullName || profile.username || profile.email || "U";
    const trimmed = source.trim();
    return (trimmed.length ? trimmed.charAt(0) : "U").toUpperCase();
  }
}
