import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HotspotForm } from "@/components/admin/forms/HotspotForm";
import { demoTour } from "@/lib/demo-data";

describe("HotspotForm edit mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates an existing hotspot through the protected PATCH endpoint", async () => {
    const hotspot = demoTour.scenes[0]!.hotspots[0]!;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: hotspot }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <HotspotForm
        id={hotspot.id}
        initial={hotspot}
        sceneId={hotspot.sceneId}
        scenes={demoTour.scenes.map((scene) => ({
          id: scene.id,
          titleEn: scene.titleEn,
        }))}
        coordinates={{ pitch: hotspot.pitch, yaw: hotspot.yaw }}
      />,
    );

    await user.clear(screen.getByLabelText("English label"));
    await user.type(screen.getByLabelText("English label"), "Updated story");
    await user.click(screen.getByRole("button", { name: "Save hotspot" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Hotspot saved.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/hotspots/${hotspot.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      sceneId: hotspot.sceneId,
      labelEn: "Updated story",
    });
  });
});
