import { describe, expect, it, vi } from "vitest";

import {
  DeploymentVerificationError,
  deploymentBaseUrl,
  verifyDeployment,
} from "@/lib/deployment/verification";

function jsonResponse(
  data: Record<string, unknown>,
  { noStore = false }: { noStore?: boolean } = {},
) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(noStore ? { "Cache-Control": "no-store, max-age=0" } : {}),
    },
  });
}

function successfulFetch() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void init;
    const url = new URL(input.toString());
    if (url.pathname === "/api/health/live") {
      return jsonResponse(
        { liveness: "alive", release: "release-123" },
        { noStore: true },
      );
    }
    if (url.pathname === "/api/health") {
      return jsonResponse(
        {
          readiness: "ready",
          release: "release-123",
          environment: "production",
          dataSource: "database",
        },
        { noStore: true },
      );
    }
    if (url.pathname === "/api/tours") {
      return jsonResponse({ items: [{ slug: "da-nang" }], total: 1 });
    }
    if (url.pathname === "/api/tours/da-nang") {
      return jsonResponse({ slug: "da-nang", scenes: [{ id: "scene-1" }] });
    }
    return new Response(null, { status: 404 });
  });
}

describe("deployment verification", () => {
  it("accepts HTTPS origins and local HTTP only", () => {
    expect(deploymentBaseUrl("https://tour.example.com/").origin).toBe(
      "https://tour.example.com",
    );
    expect(deploymentBaseUrl("http://127.0.0.1:3000").origin).toBe(
      "http://127.0.0.1:3000",
    );
    expect(() => deploymentBaseUrl("http://tour.example.com")).toThrow(
      DeploymentVerificationError,
    );
    expect(() =>
      deploymentBaseUrl("https://user:secret@tour.example.com"),
    ).toThrow(DeploymentVerificationError);
    expect(() =>
      deploymentBaseUrl("https://tour.example.com/private/path"),
    ).toThrow(DeploymentVerificationError);
  });

  it("verifies health and the existing published tour using GET requests", async () => {
    const fetchImplementation = successfulFetch();

    await expect(
      verifyDeployment("https://tour.example.com", fetchImplementation),
    ).resolves.toEqual({
      origin: "https://tour.example.com",
      release: "release-123",
      dataSource: "database",
      tourSlug: "da-nang",
      publishedScenes: 1,
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    for (const call of fetchImplementation.mock.calls) {
      expect(call[1]).not.toHaveProperty("method");
      expect(call[1]).toMatchObject({
        cache: "no-store",
        redirect: "error",
      });
    }
  });

  it("rejects remote deployments that expose bundled demo data", async () => {
    const fetchImplementation = successfulFetch();
    fetchImplementation.mockImplementationOnce(async () =>
      jsonResponse(
        { liveness: "alive", release: "release-123" },
        { noStore: true },
      ),
    );
    fetchImplementation.mockImplementationOnce(async () =>
      jsonResponse(
        {
          readiness: "ready",
          release: "release-123",
          environment: "production",
          dataSource: "bundled-demo",
        },
        { noStore: true },
      ),
    );

    await expect(
      verifyDeployment("https://tour.example.com", fetchImplementation),
    ).rejects.toThrow("production database mode");
  });

  it("fails when monitoring responses can be cached", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({ liveness: "alive", release: "release-123" }),
    );

    await expect(
      verifyDeployment("https://tour.example.com", fetchImplementation),
    ).rejects.toThrow("Cache-Control: no-store");
  });
});
