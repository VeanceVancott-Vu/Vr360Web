# REST API

Every endpoint returns one envelope:

```json
{ "success": true, "data": {} }
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "fields": { "q": ["Too small"] }
  }
}
```

## Public endpoints

| Method | Path                            | Notes                                          |
| ------ | ------------------------------- | ---------------------------------------------- |
| GET    | `/api/health/live`              | Process liveness; does not check dependencies  |
| GET    | `/api/health`                   | Service and database status                    |
| GET    | `/api/tours?page=1&pageSize=12` | Published tours only                           |
| GET    | `/api/tours/:slug`              | Published nested scenes, hotspots, and media   |
| GET    | `/api/scenes/:id`               | One published scene from a published tour      |
| GET    | `/api/categories`               | Categories containing published scenes         |
| GET    | `/api/search?q=bridge`          | 2–80 characters; at most 6 tours and 12 scenes |
| POST   | `/api/analytics/events`         | Opt-in, privacy-minimized events; throttled    |

Example:

```bash
curl "http://localhost:3000/api/tours/da-nang"
curl "http://localhost:3000/api/search?q=beach"
```

```bash
curl -X POST "http://localhost:3000/api/analytics/events" \
  -H "Content-Type: application/json" \
  -d '{"tourId":"tour-da-nang","sceneId":"scene-overview","eventType":"SCENE_OPENED","sessionToken":"random-session-token-123456"}'
```

The tour sends this request only after explicit analytics consent and never
while a supported browser privacy signal is active. `sessionToken` is a
same-session random value (16–128 URL-safe characters); the server replaces it
with a daily HMAC digest before storage. It is never stored or logged as an
analytics value. `TOUR_OPENED` omits its scene ID. Accepted responses use
`202` and `Cache-Control: no-store`. See [analytics privacy](privacy.md).

## Authentication

`POST /api/auth/login`, `POST /api/auth/logout`, and
`GET /api/auth/session` manage the signed HTTP-only session. Login and logout are
same-origin. Login is rate-limited and returns only safe user fields.

## Administrator CRUD

Authenticated resources are `tours`, `categories`, `scenes`, `hotspots`, and
`media`.

| Method               | Path                       | Result                                    |
| -------------------- | -------------------------- | ----------------------------------------- |
| GET / POST           | `/api/admin/:resource`     | List or create                            |
| GET / PATCH / DELETE | `/api/admin/:resource/:id` | Read, replace validated fields, or delete |

Mutations require a valid administrator session and a same-origin `Origin`
header. Zod applies resource and type-specific validation. Duplicate constraints
return `409`; invalid bodies return `422`; protected operations return `401`;
cross-origin mutations return `403`; referenced deletes return `409`.

Analytics and login use an in-memory fixed window during development and a
shared Upstash Redis fixed window in production. Requests over the configured
threshold return `429`; production requests return `503` if shared protection
cannot be configured or reached.

`GET /api/health/live` reports process liveness without querying application
data. `GET /api/health` reports `readiness`, `environment`, `release`,
`database`, and `dataSource` in its success envelope. Development without MySQL reports
`bundled-demo`; production configuration or database failures return `503`.
Both checks are non-cacheable and perform no application-data writes.
