# Analytics privacy

Analytics is optional and disabled until a visitor makes an explicit choice in
the tour. Declining does not limit any tour feature. A visitor can reopen
**Privacy** from the tour header and change the choice at any time.

Global Privacy Control (GPC) and the browser's Do Not Track signal override a
stored grant. While either signal is active, the application does not create an
analytics session token or send analytics events, and the settings dialog does
not offer a way to override the signal.

## Data collected after opt-in

The allowlisted event types are:

- tour opened;
- destination opened;
- hotspot selected; and
- narration started.

An event contains the tour ID, event type, optional scene ID, event time, and a
daily server-generated HMAC digest. The application does not add the visitor's
name, email, account ID, user agent, referrer, precise location, or raw network
address to an analytics event. It uses no analytics or advertising cookies and
does not add cross-site tracking.

The browser stores the choice in local storage and a random token in session
storage only after consent. The token is sent only to the same-origin analytics
endpoint. The server replaces it with a purpose-separated HMAC-SHA256 digest
before database storage. Digests rotate at UTC midnight, which prevents the
application from joining a visit across days. The request address used for
abuse throttling is separately HMACed before it reaches the rate-limit store.

## Production configuration

Set a dedicated random `ANALYTICS_HASH_SECRET` with at least 32 characters.
Do not reuse `SESSION_SECRET`. Set `ANALYTICS_RETENTION_DAYS` to an integer
from 1 through 365; it defaults to 90. Production readiness fails if these
analytics settings are invalid.

Existing `TourViewEvent.anonymousSessionId` is retained as a schema-compatible
column name, but new rows contain only the 64-character daily HMAC digest. No
schema migration or rewrite of existing analytics rows is performed by this
change.

## Retention operation

Preview the number of expired rows without changing the database:

```bash
npm run analytics:prune
```

After reviewing the cutoff and count, explicitly apply the deletion:

```bash
npm run analytics:prune -- --apply
```

Schedule the applied command once per day in the production job runner and
alert on failures. The command reports only the retention window, cutoff,
aggregate row count, and result; it does not print event contents or connection
credentials. Database backups need an aligned retention policy, because pruning
the live table does not remove rows already present in older backups.

This document describes the project's technical behavior, not a legal
compliance certification. Deployment owners should review the final notice,
retention period, hosting region, and applicable obligations for their users.
