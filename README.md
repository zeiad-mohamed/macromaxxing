# MacroMaxxing 🍽️

**Stack your plate. Max your macros.**

A single-page meal builder that lives in Next.js: define ingredients (per-100g nutrition), compose them into meals, stack meals and ingredients onto a daily plan, and watch the calorie/macro totals against your daily goals — with a stacked Chart.js breakdown of every plan entry.

Each user gets an account, and their plan is stored server-side so it follows them across devices.

## Features

- **Ingredients** — name + calories/macros per 100g, live per-field validation (invalid values are never kept), duplicate-name protection
- **Meals** — ingredients grouped with gram amounts; collapsible ingredient lists; per-meal totals
- **Plan** — the same meal or ingredient can be stacked multiple times with servings/grams; entries can be toggled
- **Daily goals** — calories + each macro target on the summary cards with progress bars; dashed goal marks in the chart
- **Nutrition chart** — one Chart.js dataset per enabled plan entry (protein / carbs / fat)
- **Accounts** — register and sign in with email + password; sessions are httpOnly cookies backed by a revocable server-side session table
- **Cloud sync** — plan state is validated server-side with the same rules as JSON import and stored per user; localStorage stays as an offline cache so the app keeps working without a connection
- **Export / import** — the original JSON snapshot export is still a local feature and doubles as a data backup

## Getting started

Prerequisites: Node.js 20.9+, npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

Create an account on `/register` and start stacking. Data persists in `next dev`/`next start` runs until you sign a device out.

Other scripts:

```bash
npm run build      # production build (Turbopack)
npm start          # serve the production build
npm run lint
```

## How data flows

1. All plan edits happen instantly in a local reducer (`src/hooks/useMealBuilder.js`) and are mirrored to `localStorage`.
2. When signed in, `src/hooks/useCloudSync.js` loads the account's saved state on sign-in (`GET /api/state`) and pushes changes with a debounced `PUT /api/state`.
3. Every incoming payload is validated server-side by the exact same validators the client uses for JSON imports (`src/lib/dataIO.js`), so the database can never hold an invalid state graph. Conflicts are last-write-wins.
4. Signing out clears the device copy.

## Storage & configuration

- SQLite via Node's built-in `node:sqlite` — no native dependencies. Defaults to `data/macro-maxxing.db` (gitignored).
- Override the location with `MMX_DB_PATH=/path/to/db.sqlite`.
- Cap the number of registrable accounts with `MMX_MAX_USERS=100` (unset or invalid = no limit; existing accounts can always sign in — the cap applies to registration only, extra registrations get a 403).
- To move to a hosted database (Postgres, Turso…), swap the driver in `src/lib/server/db.js`; only that module touches storage.
- Session cookie: `mm_session`, httpOnly, `SameSite=Lax`, `Secure` when serving over HTTPS. Sessions expire after 30 days and are pruned opportunistically.

## Project structure

```
src/app/                 pages (/, /login, /register) + API route handlers (src/app/api/**)
src/app/client.js        client-only wrapper: renders the SPA via next/dynamic (ssr: false)
src/proxy.js             optimistic auth redirects (Next 16's renamed middleware)
src/components/          panels, plan UI, shared inputs, auth screens
src/hooks/               useMealBuilder (reducer + actions), useServerSession, useCloudSync
src/lib/                 pure nutrition/validation/serialization logic shared by client AND server
src/lib/server/          db, sessions, passwords, users, state store
src/lib/shared/          constants shared across the client/server/proxy boundary
```

## Why the client is "ssr: false"

The builder is a personal tool behind a login screen — there is nothing to SEO, and its initial state comes from `localStorage`/the server, so prerendering the app body would only fight hydration. The app tree renders client-only; static shells for `/`, `/login`, and `/register` load instantly.

## Not built yet (deliberately)

Needed before opening this to the general public:

- Login rate limiting / lockout
- Email verification and password reset flows
- Multi-tab conflict resolution (currently last-write-wins per device)
- Hosted deployment story (works locally; see the database note above for the migration path)

`prompt.md` documents the original Vite-era behavioral spec the implementation set out to follow.
