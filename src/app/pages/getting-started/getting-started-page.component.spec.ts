import {HttpResponse} from "@angular/common/http";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Router} from "@angular/router";
import {of} from "rxjs";

import {APP_PATHS} from "../../core/app-paths";
import {
  AccountMembersApiClient,
  AccountsApiClient,
  AccountConnectionsApiClient,
  EtlScenarioApi
} from "../../core/api";
import {AccountCatalogService, AccountContextService} from "../../core/state";
import {AccountConnection, Marketplace} from "../../shared/models";
import {GettingStartedPageComponent} from "./getting-started-page.component";

describe("GettingStartedPageComponent", () => {
  let router: jasmine.SpyObj<Router>;
  let etlScenarioApi: jasmine.SpyObj<EtlScenarioApi>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>("Router", ["navigateByUrl"]);
    etlScenarioApi = jasmine.createSpyObj<EtlScenarioApi>("EtlScenarioApi", ["run"]);

    TestBed.configureTestingModule({
      imports: [GettingStartedPageComponent],
      providers: [
        {provide: Router, useValue: router},
        {provide: EtlScenarioApi, useValue: etlScenarioApi},
        {provide: AccountsApiClient, useValue: jasmine.createSpyObj("AccountsApiClient", ["create"])},
        {provide: AccountConnectionsApiClient, useValue: jasmine.createSpyObj("AccountConnectionsApiClient", ["list", "create"])},
        {provide: AccountMembersApiClient, useValue: jasmine.createSpyObj("AccountMembersApiClient", ["create"])},
        {provide: AccountContextService, useValue: jasmine.createSpyObj("AccountContextService", ["setAccountId", "clear"])},
        {provide: AccountCatalogService, useValue: jasmine.createSpyObj("AccountCatalogService", ["upsertAccount"])}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it("redirects to overview after successful sync start", () => {
    // @ts-ignore
    etlScenarioApi.run.and.returnValue(of(new HttpResponse({status: 200})));

    const fixture = TestBed.createComponent(GettingStartedPageComponent);
    const component = fixture.componentInstance;

    const connection: AccountConnection = {
      id: 2,
      accountId: 11,
      marketplace: Marketplace.Wildberries,
      active: true,
      createdAt: "",
      updatedAt: "",
      maskedCredentials: ""
    };

    component.accountId = 11;
    component.connections = [connection];

    component.inviteSkipped = true;

    component.startSync();

    expect(router.navigateByUrl).toHaveBeenCalledWith(APP_PATHS.overview(11), {replaceUrl: true});
  });

  it("redirects to overview after sync start returns 202", () => {
    // @ts-ignore
    etlScenarioApi.run.and.returnValue(of(new HttpResponse({status: 202})));

    const fixture = TestBed.createComponent(GettingStartedPageComponent);
    const component = fixture.componentInstance;

    const connection: AccountConnection = {
      id: 3,
      accountId: 12,
      marketplace: Marketplace.Wildberries,
      active: true,
      createdAt: "",
      updatedAt: "",
      maskedCredentials: ""
    };

    component.accountId = 12;
    component.connections = [connection];

    component.inviteSkipped = true;

    component.startSync();

    expect(router.navigateByUrl).toHaveBeenCalledWith(APP_PATHS.overview(12), {replaceUrl: true});
  });
});
