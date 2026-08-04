import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";

describe("API response helpers", () => {
  it("creates the documented success envelope", async () => {
    const response = apiSuccess({ value: 42 }, { status: 201 });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { value: 42 },
    });
  });

  it("creates safe failure envelopes and flattened fields", async () => {
    const result = z
      .object({ name: z.string().min(2) })
      .safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = zodFields(result.error);
    const response = apiError("VALIDATION_ERROR", "Invalid.", 422, fields);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.fields?.name).toHaveLength(1);
  });
});
