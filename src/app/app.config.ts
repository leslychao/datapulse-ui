import {ApplicationConfig} from "@angular/core";
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {provideRouter} from "@angular/router";
import {authHttpInterceptor} from "./core/auth";
import {appRoutes} from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authHttpInterceptor]))
  ]
};
