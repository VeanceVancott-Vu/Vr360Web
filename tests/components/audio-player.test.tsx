import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AudioNarrationPlayer } from "@/components/tour/panels/AudioNarrationPlayer";
import { demoTour } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("AudioNarrationPlayer", () => {
  it("shows transcript fallback without broken media controls", () => {
    render(
      <AudioNarrationPlayer
        scene={demoTour.scenes[0]!}
        language="en"
        dictionary={getDictionary("en")}
      />,
    );
    expect(
      screen.getByText("Narration is not available for this destination."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play" }),
    ).not.toBeInTheDocument();
  });
});
