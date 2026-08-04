import { describe, expect, it } from "vitest";

import {
  getPublicDataMode,
  getServerEnvironment,
  ServerEnvironmentError,
} from "@/lib/env.server";

describe("server environment policy", () => {
  it("keeps bundled demo mode available for local development", () => {
    expect(getPublicDataMode({ NODE_ENV: "development" })).toBe("bundled-demo");
    expect(getPublicDataMode({ NODE_ENV: "test" })).toBe("bundled-demo");
  });

  it("uses database mode whenever a database is configured", () => {
    expect(
      getPublicDataMode({
        NODE_ENV: "development",
        DATABASE_URL: "mysql://local-database",
      }),
    ).toBe("database");
  });

  it("rejects production without the core runtime configuration", () => {
    let captured: unknown;
    try {
      getServerEnvironment({ NODE_ENV: "production" });
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(ServerEnvironmentError);
    expect((captured as ServerEnvironmentError).fields).toEqual([
      "DATABASE_URL",
      "SESSION_SECRET",
      "NEXT_PUBLIC_SITE_URL",
    ]);
  });

  it("accepts a complete production database configuration", () => {
    const environment = {
      NODE_ENV: "production",
      DATABASE_URL: "mysql://production-database",
      SESSION_SECRET: "a-production-session-secret-at-least-32-characters",
      NEXT_PUBLIC_SITE_URL: "https://tour.example.test",
    };

    expect(getServerEnvironment(environment)).toMatchObject(environment);
    expect(getPublicDataMode(environment)).toBe("database");
  });

  it("rejects invalid production site URLs without exposing their value", () => {
    expect(() =>
      getServerEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "mysql://production-database",
        SESSION_SECRET: "a-production-session-secret-at-least-32-characters",
        NEXT_PUBLIC_SITE_URL: "file:///private/path",
      }),
    ).toThrow(ServerEnvironmentError);
  });
});
