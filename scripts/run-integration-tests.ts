import "dotenv/config";

import { spawnSync } from "node:child_process";

import { assertSafeIntegrationDatabaseUrl } from "../tests/integration/database-guard";

function runNpx(arguments_: string[], environment: NodeJS.ProcessEnv) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, arguments_, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  const applicationDatabaseUrl = process.env.DATABASE_URL;
  const integrationDatabaseUrl = assertSafeIntegrationDatabaseUrl(
    process.env.INTEGRATION_DATABASE_URL,
    applicationDatabaseUrl,
  );
  const testEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    APPLICATION_DATABASE_URL: applicationDatabaseUrl ?? "",
    DATABASE_URL: integrationDatabaseUrl,
    SESSION_SECRET:
      process.env.SESSION_SECRET ??
      "integration-only-session-secret-at-least-thirty-two-characters",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  };

  runNpx(["prisma", "migrate", "deploy"], testEnvironment);
  runNpx(
    ["vitest", "run", "--config", "vitest.integration.config.ts"],
    testEnvironment,
  );
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Integration test setup failed.";
  console.error(message);
  process.exitCode = 1;
}
