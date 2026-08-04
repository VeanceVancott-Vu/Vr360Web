import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SceneSidebar } from "@/components/tour/panels/SceneSidebar";
import { demoTour } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("SceneSidebar", () => {
  it("filters scenes and selects a visible result", async () => {
    const onSelect = vi.fn();
    render(
      <SceneSidebar
        open
        language="en"
        dictionary={getDictionary("en")}
        categories={demoTour.categories}
        scenes={demoTour.scenes}
        activeSceneId={demoTour.scenes[0]!.id}
        returnFocusRef={{ current: null }}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByRole("searchbox"), "Marble Mountains");
    expect(
      screen.getByRole("button", { name: /Marble Mountains/ }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Marble Mountains/ }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "ngu-hanh-son" }),
    );
  });

  it("keeps the closed panel inert and restores its opener after Escape", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const props = {
      language: "en" as const,
      dictionary: getDictionary("en"),
      categories: demoTour.categories,
      scenes: demoTour.scenes,
      activeSceneId: demoTour.scenes[0]!.id,
      returnFocusRef: { current: trigger },
      onSelect: vi.fn(),
      onClose,
    };
    const { rerender } = render(<SceneSidebar {...props} open={false} />);
    const sidebar = document.getElementById("scene-sidebar");
    expect(sidebar).toHaveAttribute("inert");

    rerender(<SceneSidebar {...props} open />);
    expect(sidebar).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<SceneSidebar {...props} open={false} />);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
