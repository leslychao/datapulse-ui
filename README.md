# DataPulse UI

DataPulse UI is an Angular 18 application for the DataPulse product. It provides authenticated routing, account selection, onboarding, and summary dashboards with a strict, predictable account context model.

## Requirements

- Node.js 18+
- npm 9+

## Install

```bash
npm install
```

## Development

```bash
npm run start
```

The dev server runs on `http://localhost:4200` and uses `proxy.conf.json` for API routing.

## Environment configuration

Runtime auth and OAuth2 endpoints are configured in `src/environments/environment.ts`.

Key fields:
- `auth.loginPath`: OAuth2 login start endpoint.
- `auth.logoutPath`: OAuth2 logout endpoint.
- `auth.logoutRedirectUrl`: URL to return to after logout.
- `auth.keycloak.*`: Keycloak registration settings.

## Architecture

The application follows a strict layered layout:

- **core**: infrastructure (routing, guards, auth, API client, state).
- **shared**: shared UI components, models, and utilities.
- **features**: domain-specific UI building blocks.
- **pages**: routed screens.

See `ARCHITECTURE.md` for details.

## Key flows

### Login → accounts → onboarding/select

1. After login, the app loads accounts via `GET /api/iam/accounts`.
2. If the list is empty, the app always redirects to `/app/onboarding`.
3. If the list is not empty, the app shows account selection.
4. Selecting an account **does not** call the backend; it only stores the account id and redirects to summary.

### Onboarding

- The onboarding wizard has three steps and supports returning to previous steps.
- Wizard state is stored in memory only (no localStorage).
- After successful sync start, the app navigates to `/app/:accountId/home/summary`.

### Local storage

Only one key is used:

- `datapulse.accountId`

No other localStorage keys are permitted.

## Debugging

- Use the browser network tab to verify `GET /api/iam/accounts` on refresh and navigation.
- Inspect routing decisions in `core/guards` and state updates in `core/state`.

## Build

```bash
npm run build
```
