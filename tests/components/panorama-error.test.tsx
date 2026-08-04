import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PanoramaErrorState } from "@/components/vr/PanoramaErrorState";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("PanoramaErrorState", () => {
  it("keeps a recoverable retry action", async () => {
    const retry = vi.fn();
    render(
      <PanoramaErrorState
        dictionary={getDictionary("en")}
        message="Image unavailable."
        onRetry={retry}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Image unavailable.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
