import {NO_ERRORS_SCHEMA} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {ActivatedRoute, Router, convertToParamMap} from "@angular/router";
import {of} from "rxjs";

import {
  AccountConnectionsApiClient,
  AccountMembersApiClient,
  AccountsApiClient,
  IamApiClient
} from "../../core/api";
import {AccountContextService} from "../../core/state";
import {AccountResponse} from "../../shared/models";
import {ToastService} from "../../shared/ui";
import {WorkspacesPageComponent} from "./workspaces-page.component";

describe("WorkspacesPageComponent", () => {
  let iamApi: jasmine.SpyObj<IamApiClient>;
  let connectionsApi: jasmine.SpyObj<AccountConnectionsApiClient>;
  let membersApi: jasmine.SpyObj<AccountMembersApiClient>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    iamApi = jasmine.createSpyObj<IamApiClient>("IamApiClient", ["getAccessibleAccounts"]);
    connectionsApi = jasmine.createSpyObj<AccountConnectionsApiClient>("AccountConnectionsApiClient", ["list"]);
    membersApi = jasmine.createSpyObj<AccountMembersApiClient>("AccountMembersApiClient", ["list"]);
    router = jasmine.createSpyObj<Router>("Router", ["navigate", "navigateByUrl"]);
    router.navigate.and.returnValue(Promise.resolve(true));

    const routeStub: ActivatedRoute = {
      paramMap: of(convertToParamMap({})),
      snapshot: {paramMap: convertToParamMap({})},
      pathFromRoot: []
    } as ActivatedRoute;
    routeStub.pathFromRoot = [routeStub];

    TestBed.configureTestingModule({
      imports: [WorkspacesPageComponent],
      providers: [
        {provide: IamApiClient, useValue: iamApi},
        {provide: AccountConnectionsApiClient, useValue: connectionsApi},
        {provide: AccountMembersApiClient, useValue: membersApi},
        {provide: AccountsApiClient, useValue: jasmine.createSpyObj("AccountsApiClient", ["update", "remove"])},
        {provide: Router, useValue: router},
        {provide: ActivatedRoute, useValue: routeStub},
        {provide: ToastService, useValue: jasmine.createSpyObj("ToastService", ["success", "error"])}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it("updates the current badge when the workspace context changes", () => {
    const accounts: AccountResponse[] = [
      {id: 1, name: "Alpha", active: true, createdAt: "", updatedAt: ""},
      {id: 2, name: "Beta", active: true, createdAt: "", updatedAt: ""}
    ];

    iamApi.getAccessibleAccounts.and.returnValue(of(accounts));
    connectionsApi.list.and.returnValue(of([]));
    membersApi.list.and.returnValue(of([]));

    const fixture = TestBed.createComponent(WorkspacesPageComponent);
    const accountContext = TestBed.inject(AccountContextService);

    fixture.detectChanges();

    const getCurrentRowText = () => {
      const rows = Array.from(
        fixture.nativeElement.querySelectorAll("tr.workspace-row")
      ) as HTMLElement[];
      const currentRow = rows.find((row) => row.textContent?.includes("Current"));
      return currentRow?.textContent ?? "";
    };

    expect(getCurrentRowText()).toContain("ID: 1");

    accountContext.setCurrentWorkspace(2).subscribe();
    fixture.detectChanges();

    expect(getCurrentRowText()).toContain("ID: 2");
  });
});
