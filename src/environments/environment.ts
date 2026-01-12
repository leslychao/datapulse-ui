export const environment = {
  production: false,

  auth: {
    loginPath: "/oauth2/start",
    logoutPath: "/oauth2/sign_out",

    // куда редиректим после logout (в dev — на angular dev server)
    logoutRedirectUrl: "http://localhost:4200/app",

    // страница регистрации в Keycloak + параметры
    keycloak: {
      baseUrl: "http://localhost:8081",
      realm: "datapulse",
      registrationClientId: "datapulse-ui",
      registrationRedirectUri: "http://localhost:4180/oauth2/callback",
    },
  },
};
