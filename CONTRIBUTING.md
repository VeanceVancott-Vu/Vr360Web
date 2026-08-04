# Contributing

Use Node.js 22 and branch from `develop` into `feature/<short-name>` or
`fix/<short-name>`. Keep each pull request focused.

Before opening a pull request:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Deployment-related changes must also build the Docker image. After a staging or
production rollout, run `npm run deploy:check -- https://deployment-origin`;
the command is read-only and must remain free of authenticated or mutating
requests.

Changes to Prisma models, administrator CRUD, or record relationships must also
pass `npm run test:integration` with a dedicated
`INTEGRATION_DATABASE_URL`. The guarded runner must never target a developer,
staging, or production application database.

Use Conventional Commit-style subjects. Never commit `.env`, administrator
passwords, private panorama photography, or unlicensed audio. Panorama changes
must include attribution, dimensions, a lightweight preview, and a mobile check.
Database changes require a Prisma migration and an update to `docs/database.md`.

Accessibility and security regressions block merging. Test keyboard focus,
Escape behavior, text navigation, mutation validation, and unpublished-record
filtering for any affected flow.

Analytics changes must preserve explicit opt-in, browser privacy-signal
handling, server-side identifier hashing, and dry-run-first retention. Never add
raw addresses, session tokens, user agents, referrers, or account identifiers to
analytics storage or logs.

Public UI changes must also follow `docs/accessibility.md`. Verify focus
restoration, 200% zoom, reduced motion, forced colors, and one screen-reader path
when changing navigation, overlays, panorama controls, maps, or narration.
