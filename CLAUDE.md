# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

React + TypeScript + Vite single-page app for an electronic accessories shop: inventory (products), purchases, sales, receipts, reports and settings, with role-based access (`Admin` vs `Salesman`) and full Urdu/English bilingual UI (Urdu is the default, RTL).

## Commands

```bash
npm ci                    # install (use this, not npm install, for reproducible installs)
npm run dev                # start Vite dev server on :5173, proxies /api and /uploads to localhost:5290
npm run build               # tsc typecheck + vite production build
npm run preview             # preview the production build

npm test                    # run the full vitest suite once
npm run test:watch          # vitest watch mode
npm run test:coverage       # run tests with coverage thresholds enforced

npx vitest run src/lib/format.test.ts     # run a single test file
npx vitest run -t "name of test"          # run tests matching a name
```

There is no separate lint script; `npm run build` is the source of truth for type errors (`tsc` runs with `strict`, `noUnusedLocals`, `noUnusedParameters`).

## Architecture

**Backend contract**: the app talks to a REST API at `/api` (dev server proxies to `http://localhost:5290`). All responses are wrapped in `ApiResponse<T>` (`src/lib/types.ts`): `{ success, message, data, errors }`. Always go through the helpers in `src/lib/api.ts` (`getData`, `postData`, `putData`, `deleteData`, `sendForm`, `downloadFile`) rather than calling `api` (the axios instance) directly — they unwrap the envelope and keep error handling consistent. Use `errorMessage(error)` to turn a caught error into a display-ready string; the server localizes messages itself based on the `Accept-Language` header the request interceptor sets from `storedLanguage()`.

**Auth**: `useAuth()` (`src/hooks/useAuth.tsx`) holds the logged-in user in a context backed by `localStorage` (`moeez.token` / `moeez.user`). A 401 response (except from `/auth/login`) clears storage and redirects to `/login` via the axios response interceptor. `App.tsx` gates routes with a local `RequireAuth` wrapper; pass `adminOnly` to restrict a route to the `Admin` role. Route access and nav visibility (`src/components/Layout.tsx`'s `NAV` array) must be kept in sync when adding admin-only pages.

**i18n**: `useI18n()` / `useT()` (`src/i18n/index.tsx`) provide `t(key, ...args)` reading from `STRINGS` in `src/i18n/strings.ts`, where every key maps to a `[urdu, english]` tuple. There is no fallback language file or external translation library — add new UI text as a new key in `strings.ts` with both translations. Language choice drives `document.dir`/`lang`, a `lang-ur`/`lang-en` class on `<html>`, and is persisted under `moeez.lang`. Because direction flips between languages, layout code uses logical Tailwind properties (`ps-`, `pe-`, `start-`, `end-`, `border-s`, etc.) instead of physical `l`/`r` ones — follow this convention for anything that needs to mirror in RTL. Numbers, prices and dates stay Latin/`en-PK` in both languages (see `src/lib/format.ts`) so they line up; only chrome text (labels, nav, messages) is translated.

**Formatting helpers** (`src/lib/format.ts`): use `money()`, `number()`, `isoDate()`, `displayDate()`, `displayDateTime()` for anything rendered to the user instead of ad hoc `toLocaleString`/`Date` formatting, and the `*Label` helpers to turn raw numeric enum values from the API (`SaleType`, `PaymentMethod`, transaction type) into localized labels.

**Data fetching**: TanStack Query is the only data-fetching layer (no other cache/store). Co-locate query/mutation logic in the page component that owns it; there is no shared query-hooks directory yet.

**Testing** (`src/test/`): `renderWithProviders()` (`src/test/render.tsx`) wraps a component in `QueryClientProvider` (retries disabled), `I18nProvider` and a `MemoryRouter`, and returns a `userEvent` instance — use it instead of raw RTL `render` for anything that touches i18n, routing or queries. Pass `language` to render in a specific language, and prefer exercising both via `BOTH_LANGUAGES`. MSW (`src/test/handlers.ts`, `src/test/server.ts`) mocks the `/api` surface; `src/test/setup.ts` wires it into vitest. Coverage thresholds are enforced per `vitest.config.ts` (80% lines/statements/functions, 70% branches globally; 95% across the board for `src/lib/format.ts`) — `npm run test:coverage` will fail the run if they regress.
