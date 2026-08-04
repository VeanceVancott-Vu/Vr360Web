import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnalyticsPrivacyControl } from "@/components/tour/header/AnalyticsPrivacyControl";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("AnalyticsPrivacyControl", () => {
  it("offers an equal consent choice without preselecting analytics", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AnalyticsPrivacyControl
        dictionary={getDictionary("en")}
        preference="unknown"
        settingsOpen={false}
        onChange={onChange}
        onCloseSettings={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Optional analytics" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Do not allow" }));
    expect(onChange).toHaveBeenCalledWith("denied");
  });

  it("explains browser privacy signals and does not offer an override", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AnalyticsPrivacyControl
        dictionary={getDictionary("en")}
        preference="privacy-signal"
        settingsOpen
        onChange={vi.fn()}
        onCloseSettings={onClose}
      />,
    );

    const close = screen.getByRole("button", { name: "Close" });
    await waitFor(() => expect(close).toHaveFocus());
    expect(
      screen.getByText(/browser is sending a privacy signal/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Allow analytics" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
