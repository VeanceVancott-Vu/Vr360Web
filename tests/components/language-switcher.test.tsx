import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("announces the active language and requests a change", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher language="vi" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });
});
