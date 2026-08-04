export class UnsafeIntegrationDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeIntegrationDatabaseError";
  }
}

function databaseIdentity(value: string) {
  const url = new URL(value);
  const hostname = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname.toLowerCase(),
  )
    ? "loopback"
    : url.hostname.toLowerCase();
  const port = url.port || "3306";
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  return url.protocol + "//" + hostname + ":" + port + "/" + databaseName;
}

export function assertSafeIntegrationDatabaseUrl(
  integrationDatabaseUrl: string | undefined,
  applicationDatabaseUrl: string | undefined,
) {
  const value = integrationDatabaseUrl?.trim();
  if (!value) {
    throw new UnsafeIntegrationDatabaseError(
      "Set INTEGRATION_DATABASE_URL to a dedicated test database.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeIntegrationDatabaseError(
      "INTEGRATION_DATABASE_URL must be a valid MySQL URL.",
    );
  }
  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
    throw new UnsafeIntegrationDatabaseError(
      "INTEGRATION_DATABASE_URL must use mysql:// or mariadb://.",
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!databaseName || !/(^|[_-])(test|testing)([_-]|$)/i.test(databaseName)) {
    throw new UnsafeIntegrationDatabaseError(
      "The integration database name must contain a separate test marker.",
    );
  }

  const applicationValue = applicationDatabaseUrl?.trim();
  if (
    applicationValue &&
    databaseIdentity(value) === databaseIdentity(applicationValue)
  ) {
    throw new UnsafeIntegrationDatabaseError(
      "INTEGRATION_DATABASE_URL must not equal the application DATABASE_URL.",
    );
  }

  return value;
}
