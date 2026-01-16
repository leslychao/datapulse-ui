import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {ApiClient} from "../api-client.service";
import {ProductCostImportResponse} from "../../../shared/models";

@Injectable({providedIn: "root"})
export class ProductCostsApiClient {
  constructor(private readonly api: ApiClient) {}

  import(accountId: number, file: File): Observable<ProductCostImportResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.api.post<ProductCostImportResponse, FormData>(
      `/api/accounts/${accountId}/product-costs/import`,
      formData
    );
  }
}
