import { assertSafeIntegrationDatabaseUrl } from "./database-guard";

const applicationDatabaseUrl =
  "APPLICATION_DATABASE_URL" in process.env
    ? process.env.APPLICATION_DATABASE_URL
    : process.env.DATABASE_URL;
const integrationDatabaseUrl = assertSafeIntegrationDatabaseUrl(
  process.env.INTEGRATION_DATABASE_URL,
  applicationDatabaseUrl,
);

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: integrationDatabaseUrl,
});
process.env.SESSION_SECRET ??=
  "integration-only-session-secret-at-least-thirty-two-characters";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://127.0.0.1:3000";
