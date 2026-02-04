import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {CommonModule} from "@angular/common";

import {AuthUserService} from "../../core/auth";
import {AccountContextService} from "../../core/state";
import {PageLayoutComponent, PageHeaderComponent, LoadingStateComponent} from "../../shared/ui";

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
  private readonly accountContext = inject(AccountContextService);

  readonly profile$ = this.authUser.userProfile$;
  readonly accountId$ = this.accountContext.accountId$;
}
