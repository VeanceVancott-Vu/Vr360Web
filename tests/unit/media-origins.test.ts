import { describe, expect, it } from "vitest";

import {
  configuredMediaOrigins,
  isAllowedMediaUrl,
  mediaRemotePattern,
} from "@/lib/media/origins";

const environment = {
  NEXT_PUBLIC_SITE_URL: "https://vr.example.test",
  S3_PUBLIC_BASE_URL: "https://media.example.test/uploads",
  MEDIA_ALLOWED_ORIGINS:
    "https://cdn.example.test, https://audio.example.test/library",
};

describe("media URL origin validation", () => {
  it("accepts safe relative application URLs", () => {
    expect(isAllowedMediaUrl("/uploads/floor-plans/plan.png", {})).toBe(true);
  });

  it("accepts the configured S3 public origin", () => {
    expect(
      isAllowedMediaUrl(
        "https://media.example.test/uploads/panorama.jpg",
        environment,
      ),
    ).toBe(true);
  });

  it("accepts explicitly configured external media origins", () => {
    expect(
      isAllowedMediaUrl(
        "https://cdn.example.test/tours/preview.webp",
        environment,
      ),
    ).toBe(true);
    expect(configuredMediaOrigins(environment)).toEqual([
      "https://vr.example.test",
      "https://media.example.test",
      "https://cdn.example.test",
      "https://audio.example.test",
    ]);
  });

  it("allows image queries without constraining Next Image search params", () => {
    expect(
      isAllowedMediaUrl(
        "https://cdn.example.test/tours/preview.webp?width=1600",
        environment,
      ),
    ).toBe(true);

    const pattern = mediaRemotePattern("https://cdn.example.test");
    expect(pattern).toEqual({
      protocol: "https",
      hostname: "cdn.example.test",
      port: "",
      pathname: "/**",
    });
    expect(pattern).not.toHaveProperty("search");
  });

  it("rejects unauthorized and protocol-relative external origins", () => {
    expect(
      isAllowedMediaUrl(
        "https://untrusted.example.test/image.png",
        environment,
      ),
    ).toBe(false);
    expect(
      isAllowedMediaUrl("//untrusted.example.test/image.png", environment),
    ).toBe(false);
  });
});
