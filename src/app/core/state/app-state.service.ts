import {Injectable} from "@angular/core";
import {AccountCatalogService} from "./account-catalog.service";
import {AccountContextService} from "./account-context.service";

@Injectable({providedIn: "root"})
export class AppStateService {
  constructor(
    private readonly accountContext: AccountContextService,
    private readonly accountCatalog: AccountCatalogService
  ) {}

  clear(): void {
    this.accountContext.clear();
    this.accountCatalog.reset();
    sessionStorage.clear();
  }
}
