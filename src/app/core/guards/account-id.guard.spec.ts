import {ActivatedRouteSnapshot, Router} from "@angular/router";
import {RouterTestingModule} from "@angular/router/testing";
import {TestBed} from "@angular/core/testing";
import {convertToParamMap} from "@angular/router";
import {firstValueFrom, of} from "rxjs";

import {APP_PATHS} from "../app-paths";
import {AccountCatalogService, AccountContextService} from "../state";
import {accountIdGuard} from "./account-id.guard";

describe("accountIdGuard", () => {
  let router: Router;
  let accountCatalog: jasmine.SpyObj<AccountCatalogService>;
  let accountContext: jasmine.SpyObj<AccountContextService>;

  beforeEach(() => {
    accountCatalog = jasmine.createSpyObj<AccountCatalogService>("AccountCatalogService", ["load"]);
    accountContext = jasmine.createSpyObj<AccountContextService>("AccountContextService", [
      "setAccountId",
      "clear"
    ]);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {provide: AccountCatalogService, useValue: accountCatalog},
        {provide: AccountContextService, useValue: accountContext}
      ]
    });

    router = TestBed.inject(Router);
  });

  it("redirects to account selection when account id is invalid", async () => {
    const route = {parent: {paramMap: convertToParamMap({accountId: "not-a-number"})}} as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(accountIdGuard(route))
    );

    expect(router.serializeUrl(result as any)).toBe(APP_PATHS.selectAccount);
    expect(accountContext.clear).toHaveBeenCalled();
  });

  it("sets account context when account exists", async () => {
    accountCatalog.load.and.returnValue(of([{id: 7, name: "Primary"}] as any));
    const route = {parent: {paramMap: convertToParamMap({accountId: "7"})}} as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(accountIdGuard(route))
    );

    expect(result).toBeTrue();
    expect(accountContext.setAccountId).toHaveBeenCalledWith(7);
  });
});
