import {HttpResponse} from "@angular/common/http";
import {NO_ERRORS_SCHEMA} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Router} from "@angular/router";
import {of} from "rxjs";

import {APP_PATHS} from "../../core/app-paths";
import {AccountsApiClient, AccountConnectionsApiClient, EtlScenarioApi} from "../../core/api";
import {AccountCatalogService, AccountContextService} from "../../core/state";
import {Marketplace, AccountConnection} from "../../shared/models";
import {OnboardingPageComponent} from "./onboarding-page.component";

describe("OnboardingPageComponent", () => {
  let router: jasmine.SpyObj<Router>;
  let etlScenarioApi: jasmine.SpyObj<EtlScenarioApi>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>("Router", ["navigateByUrl"]);
    etlScenarioApi = jasmine.createSpyObj<EtlScenarioApi>("EtlScenarioApi", ["run"]);

    TestBed.configureTestingModule({
      imports: [OnboardingPageComponent],
      providers: [
        {provide: Router, useValue: router},
        {provide: EtlScenarioApi, useValue: etlScenarioApi},
        {provide: AccountsApiClient, useValue: jasmine.createSpyObj("AccountsApiClient", ["create", "update"])},
        {provide: AccountConnectionsApiClient, useValue: jasmine.createSpyObj("AccountConnectionsApiClient", ["list", "create"])},
        {provide: AccountContextService, useValue: jasmine.createSpyObj("AccountContextService", ["setAccountId", "clear"])},
        {provide: AccountCatalogService, useValue: jasmine.createSpyObj("AccountCatalogService", ["upsertAccount"])}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it("allows returning to previous onboarding steps", () => {
    const fixture = TestBed.createComponent(OnboardingPageComponent);
    const component = fixture.componentInstance;

    const connection: AccountConnection = {
      id: 1,
      accountId: 10,
      marketplace: Marketplace.Wildberries,
      active: true,
      lastSyncAt: null,
      lastSyncStatus: null,
      createdAt: "",
      updatedAt: ""
    };

    component.accountId = 10;
    component.connections = [connection];
    component.currentStep = 2;

    expect(component.canNavigateToStep(1)).toBeTrue();

    component.goToStep(1);

    expect(component.currentStep).toBe(1);
  });

  it("redirects to summary after successful sync start", () => {
    etlScenarioApi.run.and.returnValue(of(new HttpResponse({status: 200})));

    const fixture = TestBed.createComponent(OnboardingPageComponent);
    const component = fixture.componentInstance;

    const connection: AccountConnection = {
      id: 2,
      accountId: 11,
      marketplace: Marketplace.Wildberries,
      active: true,
      lastSyncAt: null,
      lastSyncStatus: null,
      createdAt: "",
      updatedAt: ""
    };

    component.accountId = 11;
    component.connections = [connection];

    component.startSync();

    expect(router.navigateByUrl).toHaveBeenCalledWith(APP_PATHS.homeSummary(11), {replaceUrl: true});
  });

  it("redirects to summary after sync start returns 201", () => {
    etlScenarioApi.run.and.returnValue(of(new HttpResponse({status: 201})));

    const fixture = TestBed.createComponent(OnboardingPageComponent);
    const component = fixture.componentInstance;

    const connection: AccountConnection = {
      id: 3,
      accountId: 12,
      marketplace: Marketplace.Wildberries,
      active: true,
      lastSyncAt: null,
      lastSyncStatus: null,
      createdAt: "",
      updatedAt: ""
    };

    component.accountId = 12;
    component.connections = [connection];

    component.startSync();

    expect(router.navigateByUrl).toHaveBeenCalledWith(APP_PATHS.homeSummary(12), {replaceUrl: true});
  });
});
