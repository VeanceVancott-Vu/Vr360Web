import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useDialogFocus } from "@/lib/accessibility/use-dialog-focus";

function TestDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose);
  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-label="Test dialog"
      tabIndex={-1}
    >
      <button type="button">First action</button>
      <a href="#last">Last action</a>
    </section>
  );
}

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open ? <TestDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

describe("dialog focus management", () => {
  it("traps focus, closes with Escape, and restores the opener", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open dialog" });

    await user.click(opener);
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("link", { name: "Last action" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});
