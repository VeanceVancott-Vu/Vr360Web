import { describe, expect, it } from "vitest";

import {
  getDictionary,
  parseLanguage,
  translatedField,
} from "@/lib/i18n/dictionaries";

describe("internationalization fallbacks", () => {
  it("defaults unknown URL language values to Vietnamese", () => {
    expect(parseLanguage("fr")).toBe("vi");
    expect(parseLanguage(null)).toBe("vi");
  });

  it("returns the requested dictionary", () => {
    expect(getDictionary("en").start).toBe("Start exploring");
    expect(getDictionary("vi").start).toBe("Bắt đầu khám phá");
  });

  it("falls back to the other language when a field is blank", () => {
    expect(
      translatedField(
        { titleVi: "", titleEn: "Fallback title" },
        "title",
        "vi",
      ),
    ).toBe("Fallback title");
  });
});
