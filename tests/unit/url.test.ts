import { describe, expect, it } from "vitest";

import { isSafeExternalUrl, parseSceneSlug, sceneHref } from "@/lib/utils/url";

describe("scene URL state", () => {
  it("accepts an available deep-link scene", () => {
    expect(parseSceneSlug("cau-rong", ["cau-rong"], "overview")).toBe(
      "cau-rong",
    );
  });

  it("uses the default scene for invalid state", () => {
    expect(parseSceneSlug("../secret", ["cau-rong"], "overview")).toBe(
      "overview",
    );
  });

  it("serializes language and scene without a full-page route", () => {
    expect(sceneHref("/tour/da-nang", "cau-rong", "en")).toBe(
      "/tour/da-nang?scene=cau-rong&lang=en",
    );
  });
});

describe("safe external URLs", () => {
  it.each(["https://example.com", "http://localhost:3000"])(
    "accepts %s",
    (value) => expect(isSafeExternalUrl(value)).toBe(true),
  );

  it.each(["javascript:alert(1)", "data:text/html,test", "/relative"])(
    "rejects %s",
    (value) => expect(isSafeExternalUrl(value)).toBe(false),
  );
});
