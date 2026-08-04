# Deployment and monitoring runbook

This runbook covers production rollout without replacing tour records or
uploaded assets. Application deployment, schema migration, analytics retention,
and seeding are separate operations so a new image cannot silently rewrite
content.

## Production dependencies

Configure these before routing traffic:

| Capability             | Required configuration                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| MySQL or MariaDB       | `DATABASE_URL` with encrypted transport and provider backups                    |
| Administrator sessions | Independent `SESSION_SECRET` and canonical `NEXT_PUBLIC_SITE_URL`               |
| New uploads            | S3-compatible storage variables from `.env.example`                             |
| Shared throttling      | Upstash REST URL/token and `RATE_LIMIT_DRIVER=upstash`                          |
| Analytics privacy      | Dedicated `ANALYTICS_HASH_SECRET` and approved retention days                   |
| Release visibility     | Optional `APP_VERSION`; Vercel and GitHub commit IDs are detected automatically |

Keep production secrets in the deployment provider, not in an image, repository,
or client-visible variable. The Docker build context excludes `.env` files.
`public/uploads` and `panos` are intentionally still copied into the image,
so existing local asset URLs keep resolving. Existing database URLs and records
are not migrated to S3 automatically.

## Pre-deployment gate

1. Create a provider snapshot or backup and verify that its timestamp, size, and
   encryption status are expected.
2. Restore the latest backup into an isolated database at least once before the
   first production release, then periodically thereafter.
3. Confirm that existing `/uploads/...` files are present in the release
   artifact and that the S3 bucket is ready for new uploads.
4. Run `npm ci`, `npm run db:generate`, `npm run lint`,
   `npm run typecheck`, `npm test`, and `npm run build`.
5. Review checked-in migration SQL. Apply it from a controlled release job with
   `npm run db:migrate:deploy`; never use `db:migrate` in production.
6. Do not run `db:seed` during a routine deployment. Use it only for a
   deliberate first-time initialization or administrator rotation.

## Rollout

For Vercel, add the production variables, run the controlled migration job,
deploy the immutable commit, and wait for readiness before promoting the
deployment. For Docker Compose, set `APP_VERSION` to the commit or release,
then start the database, migrate with a one-off application container, and only
then start the application:

```bash
docker compose build app
docker compose up -d db
docker compose run --rm app npm run db:migrate:deploy
docker compose up -d app
```

Prefer migration before application promotion when the migration is backward
compatible. For a change that is not backward compatible, use an expand/migrate/
contract sequence across separate releases.

After deployment, run the read-only verification:

```bash
npm run deploy:check -- https://tour.example.com
```

The command performs only GET requests. It verifies liveness, readiness,
production database mode, a published tour, and at least one published scene.
It does not sign in, upload, seed, migrate, prune analytics, or mutate data. The
manual **Deployment check** GitHub Actions workflow runs the same command.

## Health endpoints

- `GET /api/health/live` checks only that the application process can answer.
  Docker uses this endpoint so dependency outages do not cause restart loops.
- `GET /api/health` is readiness. It validates production configuration and
  performs a read-only database query. A `503` means the instance must not
  receive new traffic.

Both responses include a safe release identifier in the body and
`X-DN360-Release`, and both set `Cache-Control: no-store`. Monitor readiness
externally; do not use it as a container liveness probe.

## Monitoring baseline

Start with these alerts and tune them using real traffic:

| Signal              | Initial alert                                                   |
| ------------------- | --------------------------------------------------------------- |
| Readiness           | Non-2xx for two consecutive minutes                             |
| Liveness            | Three consecutive failures                                      |
| HTTP 5xx            | More than 2% for five minutes                                   |
| Public API latency  | p95 above 1.5 seconds for ten minutes                           |
| Database            | Connections above 80%, storage near capacity, or backup failure |
| Upload storage      | Elevated S3 errors, denied writes, or unexpected growth         |
| Rate limiter        | Upstash errors or sustained `RATE_LIMIT_UNAVAILABLE` responses  |
| TLS/domain          | Certificate or DNS expiry within 14 days                        |
| Analytics retention | Daily prune job failure or unexpected expired-row growth        |

Route alerts to a named owner and a secondary contact. Include the release ID,
environment, failing endpoint, start time, and recent deployment in incident
notifications. Readiness failure logs are structured JSON and contain an event,
release, dependency category, and error type; they intentionally omit raw error
messages that may contain credentials.

## Backups and retention

Use automated encrypted database backups with point-in-time recovery when the
provider supports it. Store copies in a separate failure domain and alert on
missed backups. Back up S3 objects independently with versioning or provider
replication. A Docker volume is persistent storage, not a backup.

Perform restore drills into an isolated environment and record recovery time and
data age. Never test a restore against the active database. Align backup
retention with the approved analytics policy because live-table pruning does not
remove events from older backups.

Schedule `npm run analytics:prune -- --apply` once per day only after reviewing
the dry run and configuring alerts. This job is deliberately not part of
application startup or deployment.

## Rollback

Keep the previous image or Vercel deployment available. If application checks
fail, stop promotion and restore the previous application release first. Do not
reverse a database migration unless its reviewed rollback is known to preserve
data. Prefer a forward fix for additive schemas. Restore a database backup only
through the incident procedure after confirming the exact recovery point and
expected data loss window.

After rollback, rerun `npm run deploy:check`, confirm an existing tour and
uploaded asset, and document the incident before attempting another rollout.
