import { describe, expect, it } from "vitest";

import { adminMutationErrorResponse } from "@/lib/admin/errors";

describe("administrator Prisma error mapping", () => {
  it.each([
    ["P2002", 409, "DUPLICATE_RECORD"],
    ["P2003", 422, "INVALID_RELATION"],
    ["P2025", 404, "NOT_FOUND"],
  ])("maps %s to HTTP %i with code %s", async (prismaCode, status, apiCode) => {
    const response = adminMutationErrorResponse({ code: prismaCode });

    expect(response).not.toBeNull();
    expect(response?.status).toBe(status);
    await expect(response?.json()).resolves.toMatchObject({
      success: false,
      error: { code: apiCode },
    });
  });
});
