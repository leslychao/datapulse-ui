import {APP_INITIALIZER, ApplicationConfig} from "@angular/core";
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {provideRouter} from "@angular/router";
import {authHttpInterceptor} from "./core/auth";
import {appRoutes} from "./app.routes";
import {authInitializer} from "./core/auth/auth-initializer";

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: authInitializer,
      multi: true
    },
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authHttpInterceptor]))
  ]
};
