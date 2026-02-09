import {TestBed} from "@angular/core/testing";
import {NgZone} from "@angular/core";
import {Router} from "@angular/router";
import {Subject} from "rxjs";

import {AccountContextService} from "./account-context.service";

const STORAGE_KEY_ID = "datapulse.accountId";
const STORAGE_KEY_NAME = "datapulse.accountName";

describe("AccountContextService", () => {
  beforeEach(() => {
    localStorage.clear();
    const routerEvents$ = new Subject<unknown>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {events: routerEvents$.asObservable()} satisfies Partial<Router>
        },
        {
          provide: NgZone,
          useValue: {run: (fn: () => void) => fn()} satisfies Partial<NgZone>
        }
      ]
    });
  });

  it("stores and clears the selected account id", () => {
    const service = TestBed.inject(AccountContextService);

    service.setAccountId(42);

    expect(service.snapshot).toBe(42);
    expect(localStorage.getItem(STORAGE_KEY_ID)).toBe("42");

    service.clear();

    expect(service.snapshot).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_ID)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_NAME)).toBeNull();
  });

  it("stores and clears the selected account name", () => {
    const service = TestBed.inject(AccountContextService);

    service.setWorkspace({id: 7, name: "North Star"});

    expect(service.snapshot).toBe(7);
    expect(service.nameSnapshot).toBe("North Star");
    expect(localStorage.getItem(STORAGE_KEY_ID)).toBe("7");
    expect(localStorage.getItem(STORAGE_KEY_NAME)).toBe("North Star");

    service.clear();

    expect(service.snapshot).toBeNull();
    expect(service.nameSnapshot).toBeNull();
  });
});
