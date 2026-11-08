# airfieldtemp

A clean starting point for a Bun + Hono + Next.js project on [starfall-kit](https://github.com/starfall-kit/starfall-kit). It comes with:

- an API with email and password auth, optional Google and Steam sign-in, and a `/health` route;
- a Next.js app that renders one page of plain text;
- the kit's lint, format and TypeScript settings, plus tests and CI.

## Getting started

1. Create a repository from this template, then clone it.
2. Create a GitHub token (classic) with `read:packages` and export it as `STARFALL_KIT_TOKEN`.
3. Run:

   ```bash
   cp .env.example .env
   docker compose up -d
   bun install
   bun run dev
   ```

4. Before going further:
   - Set `AUTH_SECRET` in `.env` to at least 32 random characters (`openssl rand -base64 48`).
   - Rename `starter` and `@starter/*` to your project's name.

`bun run dev` applies migrations and starts both apps:

- **Web app:** http://localhost:3000.
- **API:** http://localhost:6060.
- **API through the web app:** http://localhost:3000/api. Use this path from the browser.

Run `bun run check` for lint, format, type checks, knip, tests and builds.

## Layout

API paths are relative to `apps/api`, which imports with `~/` from its own root.

| Path                           | What it is                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `app.ts`                       | Entry point: reads config, connects Postgres, Redis and email, and serves the routes               |
| `contract.ts`                  | Exports `AppType`, the only thing the web app imports from the API                                 |
| `config/config.ts`             | Environment variables, validated once at startup                                                   |
| `constants/ErrorCodes.ts`      | Every failure the API can return, with its HTTP status and message                                 |
| `database/`                    | Connection, migration runner, and `schema/` with one file per table                                |
| `routes/`                      | Chained Hono routers, one folder per route; `routes/index.ts` builds the app from its dependencies |
| `types/`                       | Shared types such as `Database` and `AppDependencies`                                              |
| `utils/`                       | Auth, email and response helpers                                                                   |
| `tests/`                       | Tests against an in-memory Postgres (PGlite) built from the schema                                 |
| `apps/web/app`, `apps/web/lib` | Next.js pages, and `lib/api.ts`, the typed server client; `@/` is the web root                     |

## How it fits together

- **One host for the browser.** The browser only talks to the web app, and Next forwards `/api/*` to the API. Session and CSRF cookies therefore belong to the web app's host: they use the `__Host-` prefix, which keeps them on that one host. Server components forward them to the API through `createServerClient`.
- **Keep the API private.** Next appends the visitor's address to `X-Forwarded-For`, and the API reads it with `CLIENT_IP_SOURCE=header:x-forwarded-for:1` for rate limiting. Add one hop for each proxy in front of Next, for example `header:x-forwarded-for:2` behind a load balancer. If the API is also reachable directly, anyone could set that header.
- **Environment variables** are checked at startup by `apps/api/config/config.ts`:
  - Production refuses to start without `RESEND_API_KEY`, because the console transport prints reset links.
  - Google needs both its ID and secret.
- **Redis is optional.** When `REDIS_URL` is set, rate limits and the Steam replay guard move to Redis, which you need once there is more than one API instance.

## Customizing the user

`database/schema/auth.ts` adds two columns to the kit's user table:

```ts
export const { users, accounts, sessions, tokens } = createAuthTablesWith({
  displayName: text('display_name'),
  avatarURL: text('avatar_url'),
});
```

The extra columns are typed everywhere with no casts. `c.get('user')` in a route, `/auth/me`, and the web app's `me.data.user.displayName` all see them.

- **Edit them through your own routes.** The kit's adapter only writes the auth fields, so `routes/profile` updates `displayName` itself with Drizzle.
- **Pre-fill them from providers.** The Google and Steam `onSignIn` hooks in `utils/auth.ts` call `fillProfile`. It copies the provider's name and avatar into empty fields only, so a name the user chose is never overwritten, and it accepts only https avatars.

## Writing protected routes

`routes/profile/index.ts` is the pattern:

```ts
.patch('/', auth.requireAuth(), auth.csrfProtection(), validate('json', schema), async c => {
  const user = c.get('user');
})
```

- **`requireAuth()`** answers 401 `notAuthenticated` without a session, and types `c.get('user')` and `c.get('session')`.
- **`csrfProtection()`** answers 403 `invalidCSRF` without the token. The app also applies it to every route as a safety net. Add it to each route that changes data anyway, so the 403 shows up in the client types.
- **`validate()`** answers 400 `invalidBody` with per-field messages.

Each middleware declares its responses, so `hc<AppType>()` clients see every status a route can return.

The kit's `/auth` routes cover the rest: register, login, logout, `/me`, email verification, password reset and change, and linked accounts.

## Social sign-in

Social routes are mounted only for providers that have configuration:

- **Google:** set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Add `<FRONTEND_URL>/api/auth/social/google/callback` as an authorised redirect URI.
- **Steam:** set `STEAM_API_KEY` (from https://steamcommunity.com/dev/apikey).

To start a flow, send the browser to `/api/auth/social/<provider>/start?redirect=/somewhere`. Signed-in users can link a provider with `?intent=link` and list or remove links through `/api/auth/accounts`. See the [auth docs](https://github.com/starfall-kit/starfall-kit#starfall-kitauth) for the account-linking rules.

## Database

The tables come from `createAuthTables()` in `apps/api/database/schema/auth.ts`. Add your own tables as new files in that folder.

- **No migration history yet.** Until the first deploy, `apps/api/drizzle` is gitignored. `bun run dev` and `bun run build` regenerate a single migration from the schema and apply it.
- **Tests** build their database straight from the schema, so they need no migration files.
- **At the first deploy,** remove `/apps/api/drizzle/` from `.gitignore` and commit migrations from then on. Also change `db:generate` so it stops deleting the folder.

## CI

`.github/workflows/ci.yml` runs `bun run check`. It installs the kit with the `STARFALL_KIT_TOKEN` secret, a token (classic) with only `read:packages`.
