import {Router, RouterStateSnapshot} from "@angular/router";
import {RouterTestingModule} from "@angular/router/testing";
import {TestBed} from "@angular/core/testing";
import {firstValueFrom, of} from "rxjs";

import {APP_PATHS} from "../app-paths";
import {AccountCatalogService, AccountContextService} from "../state";
import {accountGuard} from "./account.guard";

describe("accountGuard", () => {
  let router: Router;
  let accountCatalog: jasmine.SpyObj<AccountCatalogService>;
  let accountContext: jasmine.SpyObj<AccountContextService>;

  beforeEach(() => {
    accountCatalog = jasmine.createSpyObj<AccountCatalogService>("AccountCatalogService", ["load"]);
    accountContext = jasmine.createSpyObj<AccountContextService>("AccountContextService", ["clear"]);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {provide: AccountCatalogService, useValue: accountCatalog},
        {provide: AccountContextService, useValue: accountContext}
      ]
    });

    router = TestBed.inject(Router);
  });

  it("redirects to onboarding when no accounts exist", async () => {
    accountCatalog.load.and.returnValue(of([]));

    const state = {url: "/app/home"} as RouterStateSnapshot;
    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(accountGuard({} as never, state))
    );

    expect(router.serializeUrl(result as any)).toBe(APP_PATHS.onboarding);
  });

  it("redirects to account selection when accounts exist on onboarding route", async () => {
    accountCatalog.load.and.returnValue(of([{id: 1, name: "Main"}] as any));

    const state = {url: APP_PATHS.onboarding} as RouterStateSnapshot;
    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(accountGuard({} as never, state))
    );

    expect(router.serializeUrl(result as any)).toBe(APP_PATHS.workspaces);
  });
});
