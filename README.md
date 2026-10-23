# Da Nang 360 Explorer

An original bilingual tourism VR360 application built as a six-week internship
reference project. It combines a full-screen Pannellum/WebGL experience, connected
hotspots, scene navigation, OpenStreetMap-compatible mapping, narration controls,
a MySQL/Prisma API, and a protected content dashboard.

The included panoramas are lightweight synthetic development illustrations. They
are not photographs and are not official tourism descriptions or assets. The
project was inspired only by general immersive-tour interaction patterns and does
not reuse the reference site's source, branding, photographs, or copy.

## Features

- Welcome-first loading; the browser does not import Pannellum until the tour
  route is opened.
- Six connected demonstration scenes with scene-link, information, image, and
  safe external-link hotspots.
- Direct Pannellum integration with typed configuration, WebGL fallback,
  retries, teardown, zoom, reset, auto-rotate, fullscreen, opt-in device
  orientation, touch, mouse, and keyboard behavior.
- Deep links such as
  `/tour/da-nang?scene=cau-rong&lang=en`, plus browser back/forward restoration.
- One active scene synchronized across the viewer, URL, title, map, narration,
  panels, recent-session list, and opt-in privacy-minimized analytics.
- Responsive scene sidebar / mobile bottom sheet, information drawer, lazy
  Leaflet map, and text location fallback.
- Vietnamese-first and English UI with database-backed bilingual content.
- Narration controls with no autoplay, old-track cleanup, remembered mute
  preference, progress, volume, restart, and transcript fallback.
- Normalized MySQL schema, Prisma migration, environment-driven seed, public
  REST endpoints, signed HTTP-only sessions, same-origin mutation protection,
  validation, and throttling.
- Protected administrator dashboard with tour and scene editing, publishing,
  hotspot graph management, coordinate picking, and URL-based media metadata.
- Vitest, Testing Library, Playwright, ESLint, Prettier, strict TypeScript,
  Docker, Vercel configuration, and GitHub Actions CI.

## Screenshots

The repository intentionally does not commit generated test screenshots. After
starting the project, capture:

| View                                  | Suggested file                      |
| ------------------------------------- | ----------------------------------- |
| Welcome experience                    | `docs/screenshots/welcome.png`      |
| Desktop panorama and scene navigation | `docs/screenshots/tour-desktop.png` |
| Mobile scene bottom sheet             | `docs/screenshots/tour-mobile.png`  |
| Administrator scene editor            | `docs/screenshots/admin-scene.png`  |

## Technology

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, CSS variables,
Lucide React, Pannellum, Leaflet / React Leaflet, Prisma, MySQL 8.4, Zod, React
Hook Form, bcrypt, Vitest, Testing Library, and Playwright.

See [architecture](docs/architecture.md), [database design](docs/database.md),
[API reference](docs/api.md), [panorama guide](docs/adding-panoramas.md),
[accessibility guidance](docs/accessibility.md),
[analytics privacy](docs/privacy.md), [deployment runbook](docs/deployment.md),
and the
[internship plan mapping](docs/internship-mapping.md).

## Prerequisites

- Node.js 22 recommended; 20.19 or newer is required by this Prisma 7 setup.
- npm 10 or newer.
- Docker Desktop or another Docker Compose-compatible runtime.
- At least 2 GB of free memory for the application, MySQL, and browser tests.

## Step-by-Step Guide to Run This Project

### Option A: Quick Start (Demo / Standalone Mode - No Database Required)

If you only want to view the public VR360 tour experience without setting up MySQL:

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Generate Prisma Client**:

   ```bash
   npm run db:generate
   ```

3. **Start the Development Server**:

   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Open [http://localhost:3000](http://localhost:3000) in your browser. The application will run using the built-in read-only fallback dataset.

Bundled demo mode is limited to development and tests. A production server
requires `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, and
the production adapter/privacy settings described below, and
will never substitute bundled content for missing or unavailable database data.

---

### Option B: Full Setup (Database Mode with MySQL & Admin Dashboard)

Follow these steps for full functionality, including administrator login, database persistence, creating tours, adding scenes, and configuring hotspots:

1. **Prerequisites Verification**:
   - Node.js >= 20.19 (v22 recommended)
   - npm >= 10
   - Docker Desktop (or local MySQL server 8.4)

2. **Step 1: Environment File Setup**:
   Create a `.env` file from `.env.example` if it doesn't exist:

   ```bash
   # On macOS / Linux / Git Bash:
   cp .env.example .env

   # On Windows PowerShell:
   Copy-Item .env.example .env
   ```

   _Note: `.env` comes pre-filled with sensible local development defaults (`DATABASE_URL=mysql://dn360:dn360_db_local_2026@127.0.0.1:3307/dn360`, `ADMIN_SEED_EMAIL=admin@dn360.local`, `ADMIN_SEED_PASSWORD=Dn360Local!2026`)._

3. **Step 2: Install Dependencies**:

   ```bash
   npm install
   ```

4. **Step 3: Start MySQL Database Container**:

   ```bash
   docker compose up -d db
   ```

5. **Step 4: Generate Prisma Client**:

   ```bash
   npm run db:generate
   ```

6. **Step 5: Apply Database Migrations**:

   ```bash
   npm run db:migrate:deploy
   ```

   _(Note: Use `db:migrate:deploy` to apply existing migrations directly without requiring shadow database creation permissions)._

7. **Step 6: Seed Initial Database & Admin Account**:

   ```bash
   npm run db:seed
   ```

   _This seeds the demonstration tours and creates the administrator account:_
   - **Admin Email**: `admin@dn360.local`
   - **Admin Password**: `Dn360Local!2026`

8. **Step 7: Start Development Server**:

   ```bash
   npm run dev
   ```

9. **Step 8: Access the Application**:
   - **Public Tour Web App**: [http://localhost:3000](http://localhost:3000)
   - **Administrator Dashboard Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Administrator seed

The seed reads `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`, hashes the password
with bcrypt cost 12, and upserts exactly one development administrator. No demo
password is hardcoded. Change both the seed password and `SESSION_SECRET` before
production. To rotate a development password, change the environment value and
run `npm run db:seed` again.

## Commands

| Command                     | Purpose                                |
| --------------------------- | -------------------------------------- |
| `npm run dev`               | Start Next.js development mode         |
| `npm run build`             | Production build                       |
| `npm start`                 | Start a built application              |
| `npm run lint`              | ESLint                                 |
| `npm run typecheck`         | Strict TypeScript check                |
| `npm run format`            | Write Prettier formatting              |
| `npm run format:check`      | Verify formatting                      |
| `npm test`                  | Run Vitest once                        |
| `npm run test:watch`        | Watch unit/component tests             |
| `npm run test:integration`  | Run guarded MySQL integration tests    |
| `npm run test:e2e`          | Playwright desktop and mobile projects |
| `npm run db:generate`       | Generate Prisma client                 |
| `npm run db:migrate`        | Create/apply a development migration   |
| `npm run db:migrate:deploy` | Apply checked-in production migrations |
| `npm run db:seed`           | Seed demo tour and administrator       |
| `npm run db:studio`         | Open Prisma Studio                     |
| `npm run analytics:prune`   | Preview expired analytics rows         |
| `npm run deploy:check`      | Read-only deployed-tour verification   |

To exercise the authenticated Playwright flow, set `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD` in `.env` to the seeded administrator, then run:

```bash
npm run test:e2e
```

## Content workflow

### Add a tour

Sign in, open **Tours**, select **New tour**, provide bilingual content and local
or HTTP(S) images, save it as a draft, add scenes, set the default scene ID, then
publish. Public APIs never return draft tours.

### Add a scene

Open **Scenes**, select **New scene**, assign its tour and category, provide
bilingual copy, a 2:1 panorama URL, a lightweight preview, coordinates, initial
view, and attribution. Save as draft, test the scene, then publish.

### Add hotspots

Edit a scene, click the equirectangular coordinate picker, copy or adjust the
pitch and yaw, choose the type, fill the type-specific fields, and create the
hotspot. Scene links require a target; images and audio require a safe media
path; external links require HTTP or HTTPS. Deleting a target scene sets incoming
`targetSceneId` values to null for diagnosis.

### Replace demo panoramas

Follow [docs/adding-panoramas.md](docs/adding-panoramas.md). Keep large masters
outside Git, create a small preview, preserve rights and attribution, strip
private metadata, and use Pannellum multiresolution tiles for very large media.
The generated coastal welcome visual and six SVG panoramas are explicitly
development placeholders.

### Production uploads

Floor-plan uploads use `lib/media/storage.ts`. Development defaults to the
local `public/uploads` adapter so existing `/uploads/floor-plans/...` URLs
continue to work. Production refuses new uploads until an S3-compatible durable
store is configured; this prevents silently writing new files to an ephemeral
application filesystem. PNG, JPEG, and WebP uploads are checked for matching
signatures, readable dimensions, a 16,384-pixel per-side limit, and a
40-megapixel total limit before storage.

Set `MEDIA_STORAGE_DRIVER=s3`, `S3_REGION`, `S3_BUCKET`, and
`S3_PUBLIC_BASE_URL`. `S3_ENDPOINT` supports providers such as Cloudflare R2
or MinIO, and `S3_FORCE_PATH_STYLE=true` supports providers that require
path-style requests. Set `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
together, or omit both to use the AWS SDK credential chain. `S3_PREFIX`
defaults to `uploads`.

Tour media URLs may use relative application paths, the
`S3_PUBLIC_BASE_URL` origin, or an origin explicitly listed in the
comma-separated `MEDIA_ALLOWED_ORIGINS` setting. The same origin list feeds
server validation, Content Security Policy, and Next Image configuration.

The bucket or CDN base URL must permit public reads for saved floor-plan URLs.
Credentials stay server-side. Existing local files and database URLs are not
migrated or deleted when the S3 adapter is enabled, so current tours remain
available.

### Production data mode

Public repositories use bundled demo data only when the application is running
outside production and `DATABASE_URL` is absent. Once a database is configured,
query failures are returned as service errors; they never fall back to a
different tour. Production requires a database and fails readiness when the
core environment, durable upload storage, shared rate limiter, or database
connection is invalid.

`GET /api/health/live` is process liveness and does not query dependencies.
`GET /api/health` is a read-only readiness check. It reports the active data
source and database state, validates production adapter configuration, and
returns `503` when the deployment should not receive traffic. It does not run
migrations, seed records, or write application data. Health responses are
non-cacheable and identify the active release.

### Production rate limiting

Development uses an in-memory fixed-window limiter. Production requires the
shared Upstash Redis adapter so login and analytics limits apply across every
application instance. Set `RATE_LIMIT_DRIVER=upstash`,
`UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
`RATE_LIMIT_PREFIX` is optional and defaults to `vr360:rate-limit`.

Proxy address headers are ignored by default. Set `TRUST_PROXY_HEADERS=true`
only when the application is behind a trusted reverse proxy that overwrites
client-supplied `X-Forwarded-For` and `X-Real-IP` values. Direct deployments
must leave it false so clients cannot choose their own rate-limit identity.

The adapter performs one atomic server-side operation, gives every counter an
expiry, and stores hashed request identifiers rather than raw addresses. If the
production limiter is missing or unavailable, protected endpoints return a 503
response instead of silently bypassing request protection. See the
[official Upstash TypeScript setup](https://upstash.com/docs/redis/sdks/ts/getstarted)
for connection provisioning. Redis credentials must remain server-side.

### Analytics privacy and retention

Tour analytics is disabled by default and starts only after explicit consent.
Declining leaves every tour feature available. The privacy settings remain
available in the tour header, and Global Privacy Control or Do Not Track
disables collection even if consent was previously stored.

Set a dedicated `ANALYTICS_HASH_SECRET` of at least 32 random characters in
production and set `ANALYTICS_RETENTION_DAYS` from 1 through 365 (default 90).
The server stores daily HMAC digests instead of raw browser session tokens or
request addresses. Run `npm run analytics:prune` to preview expired rows, then
schedule `npm run analytics:prune -- --apply` daily after reviewing the dry
run. This change does not migrate, rewrite, or delete existing analytics or tour
records. See [analytics privacy](docs/privacy.md).

## API and errors

Public and administrator APIs use:

```json
{ "success": true, "data": {} }
```

or:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "fields": {}
  }
}
```

The UI preserves text navigation when WebGL, a panorama, map tiles, narration, or
the API fails. A database health problem is reported without exposing connection
details or stack traces.

## Testing

The unit and component suite covers translation fallback, viewer/hotspot
conversion, URL parsing, safe links, request schemas, API envelopes, scene
filtering, language switching, missing narration, and the recoverable viewer
error. Playwright covers welcome/start, default scene, navigation, browser back,
language, information, map selection, mobile bottom sheet, conditional WebGL
hotspot smoke, invalid login, and an environment-gated administrator flow.

Headless environments without WebGL skip the realistic hotspot smoke test.
Authenticated editing is skipped unless seeded E2E credentials are passed as
environment variables. A deliberately broken panorama can be tested safely by
creating a draft scene with an invalid local path, previewing it, and confirming
that the retry UI leaves text navigation available.

The MySQL integration lane is separate from the normal suite. Set
`INTEGRATION_DATABASE_URL` to a dedicated database whose name contains
`test`, then run `npm run test:integration`. The runner rejects the normal
`DATABASE_URL`, applies checked-in migrations only to the isolated target,
uses uniquely named records, and deletes only the records it created. CI runs
this lane against a disposable MySQL 8.4 service.

## Performance checklist

- [x] Welcome image and content paint before Pannellum code.
- [x] Only the active panorama is requested.
- [x] Only the next preview is prefetched, during idle time and outside data-saver/2G.
- [x] Leaflet JavaScript is absent until the map opens.
- [x] Scene previews lazy-load outside the active item.
- [x] Scene changes reuse one Pannellum canvas and stop old audio.
- [ ] A slow-network test still exposes titles and text navigation.
- [ ] Mobile blur and animations remain smooth on a mid-range device.
- [x] Bundled scenes use cubemaps; large equirectangular sources should use tiles.
- [ ] Preview dimensions prevent visible layout shift.
- [x] Reduced-motion mode removes pulsing and long transitions.

## Security notes

- Zod validates all public mutation and administrator input.
- Password hashes stay in MySQL and are never serialized.
- Sessions use signed HTTP-only, `SameSite=Strict` cookies; production adds
  `Secure`.
- Proxy checks are repeated in the protected layout and API.
- Login and analytics use shared Redis throttles in production and an in-memory
  adapter during local development.
- Analytics requires explicit opt-in, honors supported browser privacy signals,
  and stores daily HMAC digests instead of raw session or network identifiers.
- Administrator mutations reject cross-origin `Origin` values.
- Media URLs allow local paths and configured HTTP(S) origins; external
  hotspots allow HTTP(S) destinations independently.
- Security headers include CSP, frame denial, MIME sniffing protection,
  referrer policy, and a conservative permissions policy.
- Run `npm audit` on every lockfile update. Review advisories before applying
  `--force`; breaking automated upgrades are not an acceptable substitute for
  verification.

## Accessibility statement

The project targets WCAG 2.2 AA interaction patterns: semantic headings, visible
focus, a skip link, labelled viewer controls, keyboard-capable hotspots,
focus-trapped Escape-close dialogs, an inert scene drawer, keyboard map tabs,
reduced motion and forced colors, live scene/loading/error announcements,
localized narration controls, transcript fallback, and non-visual scene/map
lists. Panorama meaning is repeated in text. Hover is never the only access
path. See [the accessibility guide](docs/accessibility.md).

Known review work before a public production launch: complete manual testing
with NVDA, VoiceOver, and TalkBack, audit tourism copy with native speakers, and
test contrast over every final licensed panorama.

## Deployment

### Vercel

1. Provision managed MySQL with encrypted connections and connection pooling
   appropriate for serverless workloads.
2. Add `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, and a
   dedicated `ANALYTICS_HASH_SECRET` in Vercel. Configure
   `ANALYTICS_RETENTION_DAYS` for the approved retention window.
   Also configure the S3-compatible variables above for durable uploads. Seed
   variables are needed only in the controlled seed job. Configure
   `RATE_LIMIT_DRIVER=upstash` and both Upstash REST variables so login and
   analytics share limits across serverless instances.
3. Run `npm run db:migrate:deploy` from a release job.
4. Deploy. `vercel.json` generates Prisma before the Next.js build.
5. Run `npm run deploy:check -- https://your-production-origin`, then verify
   login, one scene transition, one map marker, and one controlled mutation.

Do not run development migrations during a serverless request. Review CSP tile
and media origins if a CDN or managed tile provider is added. Route production
traffic only after `/api/health` returns a successful readiness response.

### Docker production alternative

```bash
docker compose build app
docker compose up -d db
docker compose run --rm app npm run db:migrate:deploy
docker compose up -d app
```

Compose forwards `NEXT_PUBLIC_SITE_URL`, `S3_PUBLIC_BASE_URL`, and
`MEDIA_ALLOWED_ORIGINS` from `.env` as non-secret build arguments so the
generated CSP and Next Image allow-list match runtime URL validation. Rebuild
the app image whenever any of these origin settings changes.

Routine deployments do not run `db:seed`; use it only for deliberate initial
setup or administrator rotation. The Docker image excludes local `.env`
secrets but retains `public/uploads` and `panos`, preserving existing local
asset URLs. Its container health check uses liveness while external traffic
gating uses readiness.

Use a reverse proxy with TLS, private database networking, encrypted backups, log
retention, health monitoring, and external rate limiting.
Follow the [deployment and monitoring runbook](docs/deployment.md) for rollout,
alerts, backup restore drills, analytics scheduling, and data-safe rollback.

## Git workflow

Use `main` for production releases, `develop` for integrated work,
`feature/*` for scoped features, and `fix/*` for repairs. Suggested logical
commits:

1. `chore: initialize nextjs project`
2. `feat: add prisma mysql data model`
3. `feat: implement tour REST API`
4. `feat: integrate pannellum panorama viewer`
5. `feat: add scene navigation and hotspots`
6. `feat: add map and audio narration`
7. `feat: add administrator dashboard`
8. `test: add unit and end-to-end coverage`
9. `docs: add setup and internship documentation`

This repository does not manufacture commit history or claim a push.

## Known limitations

- Demo visuals are synthetic placeholders, not seam-perfect professional
  photography.
- The seed contains transcripts but no recorded narration files.
- Floor-plan binaries have a validated upload flow; other media fields still
  accept URL metadata.
- The MVP editor focuses on equirectangular media; cubemap and multiresolution
  values are supported by the data model/viewer converter but need richer form
  widgets.
- Device orientation needs HTTPS, supported mobile hardware, and browser
  permission. Automated tests cover the control state, not physical sensor
  readings.
- OpenStreetMap community tiles are appropriate for development, not high-volume
  production without checking the tile usage policy.
- The public read-only fallback is intentionally development-only and is not a
  substitute for production database backups or recovery testing.
- As of 2026-07-23, `npm audit --omit=dev` reports three transitive high-severity
  advisories in Next.js's pinned `postcss@8.4.31` and optional `sharp@0.34.5`.
  The installed `next@16.2.11` is the latest stable release, while npm's proposed
  forced fix is an unsafe downgrade to Next 9. The project does not apply that
  breaking change; monitor upstream releases, retest, and upgrade as soon as
  compatible patched ranges are available.

## Recommended next steps

Add real licensed 360 media and narration, add a multires tile manifest editor,
capture regression screenshots, complete assistive-technology testing, add
configure an external uptime/alerting owner, and deploy a staging environment
before production.
