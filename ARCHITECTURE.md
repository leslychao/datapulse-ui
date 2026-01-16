# DataPulse UI Architecture

## Directory structure

- `src/app/core`
  - **auth**: session handling, auth redirects, and HTTP interceptors.
  - **api**: typed API client, endpoints, and error mapping.
  - **guards**: routing rules and account availability enforcement.
  - **state**: account context, account catalog cache, onboarding memory state.
  - **routing**: URL matching helpers.
- `src/app/shared`
  - **models**: shared DTOs and view models.
  - **ui**: reusable UI building blocks.
- `src/app/features`
  - domain UI components used by pages.
- `src/app/pages`
  - routed screens (login, account selection, onboarding, dashboards, settings).

## Routing and guards

- **`authGuard`** blocks protected routes unless the session is authenticated.
- **`accountGuard`** is the single source of truth for account availability:
  - if no accounts exist → `/app/onboarding`.
  - if accounts exist and the user is on onboarding → `/app/select-account`.
- **`accountIdGuard`** validates the `:accountId` segment and sets `AccountContextService`.

Guards are the canonical place for routing decisions; components do not duplicate these rules.

## Account context

`AccountContextService` is the only source of the selected account id. It synchronizes
with `localStorage` under the single key `datapulse.accountId` and exposes a snapshot
for synchronous consumers.

## Account catalog cache

`AccountCatalogService` owns the in-memory list of accounts. It de-duplicates concurrent
requests and provides a consistent list to both guards and UI components.

## Onboarding state

`OnboardingStateService` stores the wizard state in memory. It is reset explicitly and
never persisted to localStorage. The onboarding flow is deterministic, supports moving
back to prior steps, and triggers summary navigation on sync success.

## RxJS and subscriptions

- Prefer `async` pipe for template consumption.
- Use `takeUntilDestroyed` for explicit subscriptions.
- Avoid nested subscriptions in favor of higher-order mapping.

## Error handling

All HTTP errors are mapped to `ApiError` via `ApiClient`. UI components handle errors by
presenting inline messages or toast notifications without side effects.

## Why these decisions

- **Guard-driven routing** guarantees that account availability and selection remain
  consistent regardless of refresh, deep links, or navigation entry points.
- **Account catalog caching** prevents duplicate HTTP calls while keeping the state
  predictable.
- **In-memory onboarding state** avoids persistence bugs and respects the product
  requirement of not using localStorage for wizard progress.
