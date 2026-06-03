# Architecture

Predictor26 is organized as a small full-stack TypeScript workspace with separate Angular and Express applications.

## Frontend

`apps/web/src/app` follows the reference Angular structure from Entrio:

```text
core/
  constants/
  guards/
  interceptors/
  models/
  providers/
  resolvers/
  services/
    providers/
  state/
  strategies/
environments/
features/
layout/
shared/
  components/
  directives/
  pipes/
  tokens/
  utils/
```

The important rule is dependency direction: features can use core and shared; shared should stay generic; core owns app-wide services, API providers, guards, interceptors, models, and state.

HTTP endpoint details should live in `core/services/providers`. Higher-level services should expose state and methods for components.

## Backend

`apps/api/src` uses matching boundaries:

```text
config/
database/
  migrations/
  queries/
modules/
shared/
  constants/
  errors/
  interfaces/
  middleware/
  utils/
```

Feature modules should use this shape:

```text
modules/<feature>/
  <feature>.routes.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.repository.ts
  <feature>.interfaces.ts
```

Routes are HTTP wiring, controllers handle request/response translation, services hold business rules, repositories own persistence access, and raw SQL belongs in the database layer.

Yes: API endpoint contracts should have explicit interfaces, and queries/database access should be isolated from route/controller files.
