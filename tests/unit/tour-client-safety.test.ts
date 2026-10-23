import { beforeEach, describe, expect, it, vi } from "vitest";

import { playAudio } from "@/lib/media/playback";
import { rememberRecentScene } from "@/lib/tour/recent-scenes";

describe("tour client safety", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("resets corrupted recent-scene JSON without crashing", () => {
    sessionStorage.setItem("dn360-recent-scenes", "{not-json");

    expect(() =>
      rememberRecentScene(sessionStorage, "scene-current"),
    ).not.toThrow();
    expect(sessionStorage.getItem("dn360-recent-scenes")).toBe(
      JSON.stringify(["scene-current"]),
    );
  });

  it("reports audio playback only after play resolves", async () => {
    let resolvePlayback: (() => void) | undefined;
    const playback = new Promise<void>((resolve) => {
      resolvePlayback = resolve;
    });
    const tracked = vi.fn();
    const rejected = vi.fn();
    const result = playAudio(
      { play: vi.fn().mockReturnValue(playback) },
      tracked,
      rejected,
    );

    expect(tracked).not.toHaveBeenCalled();
    resolvePlayback?.();
    await result;

    expect(tracked).toHaveBeenCalledOnce();
    expect(rejected).not.toHaveBeenCalled();
  });

  it("does not report rejected audio playback as successful", async () => {
    const tracked = vi.fn();
    const rejected = vi.fn();

    await playAudio(
      { play: vi.fn().mockRejectedValue(new Error("Autoplay blocked")) },
      tracked,
      rejected,
    );

    expect(tracked).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledOnce();
  });
});
