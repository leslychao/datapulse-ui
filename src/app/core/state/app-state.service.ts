import {Injectable} from "@angular/core";
import {AccountContextService} from "./account-context.service";

@Injectable({providedIn: "root"})
export class AppStateService {
  constructor(private readonly accountContext: AccountContextService) {}

  clear(): void {
    this.accountContext.clear();
    sessionStorage.clear();
  }
}
