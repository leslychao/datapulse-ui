import {Injectable} from "@angular/core";
import {Observable} from "rxjs";

import {UserProfileResponse} from "../../shared/models";
import {IamService} from "../state";

@Injectable({providedIn: "root"})
export class AuthUserService {
  readonly userProfile$: Observable<UserProfileResponse | null>;
  readonly me$: Observable<UserProfileResponse | null>;

  constructor(private readonly iamService: IamService) {
    this.userProfile$ = this.iamService.profile$;
    this.me$ = this.userProfile$;
  }
}
