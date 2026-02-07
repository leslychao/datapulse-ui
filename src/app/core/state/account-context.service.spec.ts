import {TestBed} from "@angular/core/testing";
import {firstValueFrom, skip, take} from "rxjs";

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

  it("emits updated account id after switching workspace", async () => {
    const service = TestBed.inject(AccountContextService);

    const nextValue = firstValueFrom(service.accountId$.pipe(skip(1), take(1)));

    await firstValueFrom(service.setCurrentWorkspace(101));

    await expectAsync(nextValue).toBeResolvedTo(101);
  });
});
