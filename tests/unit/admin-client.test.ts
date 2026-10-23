import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdminRequestError,
  adminLoginHref,
  adminRequest,
} from "@/lib/api/admin-client";

describe("adminRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns data from the existing API success envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { id: "tour-1" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      adminRequest<{ id: string }>("/api/admin/tours"),
    ).resolves.toEqual({
      id: "tour-1",
    });
  });

  it("preserves validation messages and field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid tour.",
              fields: { slug: ["Slug is required."] },
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const error = await adminRequest("/api/admin/tours", {
      redirectOnUnauthorized: false,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(AdminRequestError);
    expect(error).toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid tour.",
      fields: { slug: ["Slug is required."] },
    });
  });

  it("turns a non-JSON server response into a safe error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("upstream failure", { status: 500 })),
    );

    await expect(
      adminRequest("/api/admin/tours", { redirectOnUnauthorized: false }),
    ).rejects.toMatchObject({
      status: 500,
      code: "HTTP_ERROR",
      message: "The server could not complete the request.",
    });
  });

  it("maps unauthorized responses to the session-expired error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Sign in is required." },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      adminRequest("/api/admin/tours", { redirectOnUnauthorized: false }),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    expect(adminLoginHref("/admin/tours?draft=true")).toBe(
      "/admin/login?reason=session-expired&next=%2Fadmin%2Ftours%3Fdraft%3Dtrue",
    );
  });

  it("reports network failures without leaking the original error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("socket details")),
    );

    await expect(adminRequest("/api/admin/tours")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message:
        "Unable to reach the server. Check your connection and try again.",
    });
  });
});
