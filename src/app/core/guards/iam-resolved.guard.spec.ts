import {Router} from "@angular/router";
import {RouterTestingModule} from "@angular/router/testing";
import {TestBed} from "@angular/core/testing";
import {BehaviorSubject, firstValueFrom} from "rxjs";

import {APP_PATHS} from "../app-paths";
import {IamService, IamLoadState} from "../state";
import {iamResolvedGuard} from "./iam-resolved.guard";

describe("iamResolvedGuard", () => {
  let router: Router;
  let stateSubject: BehaviorSubject<IamLoadState>;

  beforeEach(() => {
    stateSubject = new BehaviorSubject<IamLoadState>("IDLE");

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: IamService,
          useValue: {
            state$: stateSubject.asObservable()
          }
        }
      ]
    });

    router = TestBed.inject(Router);
  });

  it("allows navigation when IAM is ready", async () => {
    stateSubject.next("READY");

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(iamResolvedGuard({} as never, {} as never))
    );

    expect(result).toBe(true);
  });

  it("redirects to entry when IAM is not ready", async () => {
    stateSubject.next("ERROR");

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(iamResolvedGuard({} as never, {} as never))
    );

    expect(router.serializeUrl(result as any)).toBe(APP_PATHS.login);
  });
});
