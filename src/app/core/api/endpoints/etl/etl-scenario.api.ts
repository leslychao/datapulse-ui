import {HttpResponse} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../../api-client.service";
import {EtlScenarioRequest} from "../../../../shared/models";

@Injectable({providedIn: "root"})
export class EtlScenarioApi {
  constructor(private readonly api: ApiClient) {}

  run(request: EtlScenarioRequest): Observable<HttpResponse<void>> {
    return this.api.postWithResponse<void, EtlScenarioRequest>("/api/etl/scenario/run", request);
  }
}
