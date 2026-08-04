import { describe, expect, it } from "vitest";

import {
  assertSafeIntegrationDatabaseUrl,
  UnsafeIntegrationDatabaseError,
} from "@/tests/integration/database-guard";

describe("integration database safety guard", () => {
  it("accepts a separate MySQL database with a test marker", () => {
    expect(
      assertSafeIntegrationDatabaseUrl(
        "mysql://tester:secret@127.0.0.1:3306/vr360_integration_test",
        "mysql://app:secret@127.0.0.1:3306/vr360",
      ),
    ).toBe("mysql://tester:secret@127.0.0.1:3306/vr360_integration_test");
  });

  it.each([
    [undefined, undefined],
    ["mysql://tester:secret@127.0.0.1:3306/vr360", undefined],
    ["postgresql://tester:secret@127.0.0.1:5432/vr360_test", undefined],
    [
      "mysql://tester:secret@127.0.0.1:3306/vr360_test",
      "mysql://tester:secret@127.0.0.1:3306/vr360_test",
    ],
    [
      "mysql://integration:new-secret@127.0.0.1:3306/vr360_test?pool=2",
      "mysql://application:old-secret@localhost:3306/vr360_test?pool=20",
    ],
  ])("rejects unsafe integration targets", (integrationUrl, applicationUrl) => {
    expect(() =>
      assertSafeIntegrationDatabaseUrl(integrationUrl, applicationUrl),
    ).toThrow(UnsafeIntegrationDatabaseError);
  });
});
