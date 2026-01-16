import {TestBed} from "@angular/core/testing";

import {AccountContextService} from "./account-context.service";

const STORAGE_KEY = "datapulse.accountId";

describe("AccountContextService", () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it("stores and clears the selected account id", () => {
    const service = TestBed.inject(AccountContextService);

    service.setAccountId(42);

    expect(service.snapshot).toBe(42);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("42");

    service.clear();

    expect(service.snapshot).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
