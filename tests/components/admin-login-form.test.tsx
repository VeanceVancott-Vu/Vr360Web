import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loginMocks = vi.hoisted(() => ({
  adminRequest: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/lib/api/admin-client", () => ({
  adminRequest: loginMocks.adminRequest,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: loginMocks.replace,
    refresh: loginMocks.refresh,
  }),
  useSearchParams: loginMocks.useSearchParams,
}));

import { AdminLoginForm } from "@/components/admin/forms/AdminLoginForm";

describe("AdminLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMocks.useSearchParams.mockReturnValue(new URLSearchParams());
    loginMocks.adminRequest.mockResolvedValue({});
  });

  it("shows the session-expired message supplied by protected requests", () => {
    loginMocks.useSearchParams.mockReturnValue(
      new URLSearchParams("reason=session-expired&next=%2Fadmin%2Fmedia"),
    );

    render(<AdminLoginForm />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired. Please sign in again.",
    );
  });

  it("does not trigger another unauthorized redirect while signing in", async () => {
    loginMocks.useSearchParams.mockReturnValue(
      new URLSearchParams("next=%2Fadmin%2Fmedia"),
    );
    const user = userEvent.setup();

    render(<AdminLoginForm />);

    await user.type(
      screen.getByLabelText("Administrator email"),
      "admin@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "strong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(loginMocks.adminRequest).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          redirectOnUnauthorized: false,
        }),
      ),
    );
    expect(loginMocks.replace).toHaveBeenCalledWith("/admin/media");
    expect(loginMocks.refresh).toHaveBeenCalledOnce();
  });
});
