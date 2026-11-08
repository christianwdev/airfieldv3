## Project rules

- **No code comments.** Explain anything non-obvious in the pull request or the README.
- **Latest and most type-safe.** Use the newest stable versions, and pick the design with the strongest compile-time guarantees.
- **Shared logic lives in `@starfall-kit/*`.** Fix it in starfall-kit and bump the version rather than copying code here.
- **Responses go through `apps/api/utils/response.ts`,** with failures named in `apps/api/constants/ErrorCodes.ts`. Never call `c.json` in a route.
- **Routes are chained** so they reach `AppType`. The web app calls the API through `hc<AppType>()` clients from `@starfall-kit/client`, never raw `fetch`, and imports only types from `@airfieldtemp/api`.
- **Environment variables are read once,** through `apps/api/config/config.ts`.
- **Folders by role.** API code goes in `config/`, `constants/`, `database/` (one file per table in `schema/`), `routes/<name>/index.ts`, `types/` and `utils/`, imported with `~/`.
- **No migrations are committed until the first deploy.** `apps/api/drizzle` is gitignored and `db:generate` rebuilds a single migration from `database/schema`. At the first deploy, remove the ignore and commit migrations from then on.
- Run `bun run check` before finishing.
