import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HotspotForm } from "@/components/admin/HotspotForm";

describe("HotspotForm conditional validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires a target scene when the selected type is a scene link", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <HotspotForm
        sceneId="scene-overview"
        scenes={[
          { id: "scene-overview", titleEn: "Overview" },
          { id: "scene-bridge", titleEn: "Bridge" },
        ]}
        coordinates={{ pitch: 4, yaw: -12 }}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Type"), "SCENE_LINK");
    expect(await screen.findByLabelText("Target scene")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Vietnamese label"), "Đi tiếp");
    await user.type(screen.getByLabelText("English label"), "Continue");
    await user.click(screen.getByRole("button", { name: "Create hotspot" }));

    expect(
      await screen.findByText(/expected string, received null/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
