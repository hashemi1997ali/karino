# Task Manager Client

English-first, bilingual English/German client for the Task Manager platform,
built with Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, React
Hook Form and Zod.

## Development

Copy the environment example and start the API on port `4000`:

```bash
cp .env.example .env.local
npm run dev
```

`API_SERVER_URL` is server-only. Next.js rewrites browser requests from `/api/*`
to the Express API, so the HTTP-only refresh cookie remains same-origin.

## Language and appearance

- English is the default interface language; German can be selected from the
  preferences menu.
- The selected locale is stored for one year in the `karino-locale` cookie and
  is also used for localized metadata, dates, numbers and plural labels.
- Light, dark and system themes are available. System is the default and reacts
  live to operating-system theme changes.
- The selected theme is persisted in both the `karino-theme` cookie and local
  storage.
- A pre-hydration script applies the saved or system theme before rendering to
  avoid a theme flash.

## Authentication

- The access token is kept only in module memory.
- The refresh token remains in the server-issued HTTP-only cookie.
- Failed authenticated requests share one refresh promise inside a tab.
- Web Locks serialize refresh calls between tabs when the browser supports them.
- BroadcastChannel synchronizes refreshed access tokens and sign-out events.
- `/api/session-hint` checks only whether the refresh cookie exists, avoiding an
  anonymous refresh request on every public page load.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```
