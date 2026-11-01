# Nagorik Desk

Civic issue reporting and MP-office accountability for Panchagarh-1. Citizens report local problems with a photo and a map pin, support each other's reports, and follow every step until the responsible office fixes it. Bilingual (বাংলা / English), mobile-first, light and dark.

## What it does

- **Report**: category, description, up to 3 photos (resized on the phone, EXIF/GPS stripped), exact pin or approximate area, optional anonymity. Drafts are kept on the device.
- **Feed**: trending / most supported / newest / near me, filters for status, urgency, area (including "my area") and category. Infinite scroll. Search jumps straight to a report when you type its reference (`PG-00042`).
- **Map**: clustered pins coloured by status, hover previews, map/list on phones, `?focus=<issue-id>` deep links.
- **Workflow**: MP office reviews, assigns to an office with a working-day deadline (Sun–Thu), the office acknowledges, updates and uploads proof, and the reporter confirms or reopens. Every step is on the public timeline and in the audit log.
- **Follow**: saving a report means following it: you are notified when its status changes.
- **Accountability**: public scorecard (totals, six-month trend, by area, by category, office performance, MP commitments, top contributors), a public page per office (`/offices/[id]`), and open data as CSV (`/api/export/issues`, no personal details).
- **Staff portals**: MP office (`/office`), authority officers (`/authority`), administrators (`/admin`). Staff sign in with an authenticator app.
- **Installable**: web app manifest with icons and home-screen shortcuts.

## Getting started

Requirements: Node 18.18+ and Postgres 14+ (Neon works).

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL, DATA_KEY and HMAC_KEY
npm run db:setup              # migrations + reference data (areas, categories)
npm run db:seed:demo          # optional: demo accounts and reports
npm run admin:create -- --email you@example.org --name "Your Name"
npm run dev
```

| Script | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | lint + typecheck + tests |
| `npm run db:generate` | new migration from `src/server/db/schema.ts` |
| `npm run db:migrate` | apply migrations in `drizzle/` |
| `npm run admin:reset-password` | reset a password from the command line |

Housekeeping runs from `GET /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` (Vercel Cron, or cron + curl).

## Project structure

```
src/
  app/                    routes (App Router). Pages are server components.
    (auth)/               login, register, forgot password
    api/                  media upload/serving, CSV export, health, cron
    offices/[id]/         public office scorecard
    office/ authority/ admin/   staff portals
  components/
    issue/                feed, post card, composer, filters, photo viewer, menus
    layout/               top bar, bottom bar, sidebars, footer, theme and language
    map/                  Leaflet map, location picker, layer switcher
    ui/                   design-system primitives: Dialog, forms, Avatar, Skeleton…
    staff/ admin/ auth/ profile/ notifications/ stats/
  hooks/                  useDismiss, useMediaQuery/useIsPhone, useScrollLock
  i18n/                   en.ts defines the keys; bn.ts must match (enforced by the compiler and tests)
  lib/                    client-safe logic: validation, workflow, issue helpers, CSV, notification text
  server/
    actions/              server actions ("use server"); return stable error codes, never text
    queries/              read models (feed, issues, stats, notifications…)
    services/             media, notifications, timeline, mail, SMS
    auth/ security/ db/   sessions + 2FA, permissions, rate limits, audit, Drizzle schema
tests/                    Vitest: domain rules, i18n catalogues, security, media, lib helpers
drizzle/                  SQL migrations (commit every file, including meta/_journal.json)
```

## Conventions

- **Design**: hairline borders, 2–4 px radii, square status markers, no heavy shadows. Colours are CSS variables in `globals.css` (light and dark), exposed to Tailwind in `tailwind.config.ts`.
- **Mobile first**: phones get bottom sheets (`Dialog variant="sheet"`), 36–44 px touch targets, 16 px form text (no iOS zoom), safe-area padding, and a fixed bottom bar. Responsive grids always declare a base `grid-cols-1` / `minmax(0,1fr)` track so long text can't widen the page.
- **Text**: every string goes through `t("key")`; add keys to `src/i18n/en.ts` and `src/i18n/bn.ts`. Server actions return codes such as `rate_limited`, which the UI maps to `err_<code>`.
- **Permissions**: one rule set in `src/server/auth/permissions.ts`; every action checks it.
- **Security**: per-request CSP nonce (`src/middleware.ts`), rate limits in Postgres, hashed IPs, audit log for staff actions, CSV cells protected against formula injection.

## Theme

With no saved choice the site follows the device's light/dark setting. Settings → Appearance lets people pick Device, Light or Dark.
