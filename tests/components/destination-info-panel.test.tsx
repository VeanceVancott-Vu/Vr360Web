import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DestinationInfoPanel } from "@/components/tour/panels/DestinationInfoPanel";
import { demoTour } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("DestinationInfoPanel", () => {
  it("renders localized information-hotspot content and closes with Escape", async () => {
    const scene = demoTour.scenes[0]!;
    const hotspot = {
      id: "test-info",
      sceneId: scene.id,
      type: "INFORMATION" as const,
      pitch: 0,
      yaw: 0,
      labelVi: "Thông tin phòng trọ",
      labelEn: "Room Information",
      contentVi: "Nội dung chi tiết",
      contentEn: "Detailed info content",
      icon: "Info",
      targetSceneId: null,
      imageUrl: null,
      audioUrl: null,
      externalUrl: null,
      sortOrder: 1,
      isVisible: true,
    };
    const onClose = vi.fn();

    render(
      <DestinationInfoPanel
        scene={scene}
        hotspot={hotspot}
        language="en"
        dictionary={getDictionary("en")}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: hotspot.labelEn }),
    ).toHaveTextContent(hotspot.contentEn ?? "");
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
