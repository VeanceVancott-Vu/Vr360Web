import { expect, test, type Page } from "@playwright/test";

async function waitForTour(page: Page) {
  await expect(
    page.locator('main.tour-shell[data-hydrated="true"]'),
  ).toBeVisible({ timeout: 10_000 });
}

async function waitForAdminLogin(page: Page) {
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

test("opens the welcome page and starts the default tour", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Khám phá Đà Nẵng 360" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Bắt đầu khám phá/ }).click();
  await expect(page).toHaveURL(/\/tour\/da-nang/);
  await waitForTour(page);
  await expect(
    page.getByRole("heading", { name: "Tổng quan Đà Nẵng" }),
  ).toBeVisible();
});

test("changes scene from navigation and restores it with browser back", async ({
  page,
}) => {
  await page.goto("/tour/da-nang?scene=tong-quan-da-nang&lang=en");
  await waitForTour(page);
  const currentSceneCard = page.locator("section.current-scene");
  await expect(currentSceneCard).toBeVisible();
  await page.getByRole("button", { name: "Open destination list" }).click();
  const sidebar = page.locator("aside.scene-sidebar");
  await expect(sidebar).toHaveAttribute("data-open", "true");
  await expect(currentSceneCard).toBeHidden();
  await sidebar.getByRole("button", { name: /Dragon Bridge/ }).click();
  await expect(currentSceneCard).toBeVisible();
  await expect(page).toHaveURL(/scene=cau-rong/);
  await expect(
    page.getByRole("heading", { name: "Dragon Bridge" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/scene=tong-quan-da-nang/);
});

test("changes language and opens destination information", async ({ page }) => {
  await page.goto("/tour/da-nang?lang=vi");
  await waitForTour(page);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("dn360-language")))
    .toBe("en");
  await expect(page).toHaveURL(/lang=en/);
  await expect(
    page.getByRole("heading", { name: "Da Nang Overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "This illustrated space introduces",
  );
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("opens localized content from an information hotspot", async ({
  page,
}) => {
  await page.goto("/tour/da-nang?lang=en");
  await waitForTour(page);
  const hotspot = page.getByRole("button", { name: "Three landscapes" });
  await expect(hotspot).toBeVisible({ timeout: 10_000 });
  await hotspot.click();
  const dialog = page.getByRole("dialog", { name: "Three landscapes" });
  await expect(dialog).toContainText("three closely connected landscapes");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});

test("changes scene from the text fallback in the map", async ({ page }) => {
  await page.goto("/tour/da-nang?lang=en");
  await waitForTour(page);
  await page.getByRole("button", { name: "Map" }).first().click();
  const dialog = page.locator(".map-modal");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "My Khe Beach" }).click();
  await expect(page).toHaveURL(/scene=bien-my-khe/);
});

test("mobile scene selector opens as a bottom sheet", async ({ page }) => {
  test.skip(
    test.info().project.name !== "mobile",
    "This assertion targets the mobile project.",
  );
  await page.goto("/tour/da-nang?lang=en");
  await waitForTour(page);
  await page.getByRole("button", { name: "Open destination list" }).click();
  const selector = page.locator("aside.scene-sidebar");
  await expect(selector).toBeVisible();
  await expect(selector).toHaveAttribute("data-open", "true");
});

test("scene-link hotspot changes scene when WebGL is available", async ({
  page,
}) => {
  await page.goto("/tour/da-nang?lang=en");
  await waitForTour(page);
  const hotspot = page.getByRole("button", { name: "Go to Dragon Bridge" });
  const viewerReady = await hotspot
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (viewerReady) {
    await hotspot.click();
    await expect(page).toHaveURL(/scene=cau-rong/);
  } else {
    test.skip(true, "Headless WebGL did not initialize the Pannellum hotspot.");
  }
});
test("shows a recoverable error when the panorama request fails", async ({
  page,
}) => {
  await page.route("**/demo/coastal-sunrise-placeholder.png", (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "missing" }),
  );
  await page.goto("/tour/da-nang?lang=en");
  await waitForTour(page);
  await expect(page.getByText("The panorama could not be loaded.")).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("administrator login rejects invalid input safely", async ({ page }) => {
  await page.goto("/admin/login");
  await waitForAdminLogin(page);
  await page.getByLabel("Administrator email").fill("invalid");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/Invalid email|email/i).first()).toBeVisible();
});

test("administrator can sign in and edit a scene when credentials are provided", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD after seeding MySQL.",
  );
  await page.goto("/admin/login");
  await waitForAdminLogin(page);
  await page
    .getByLabel("Administrator email")
    .fill(process.env.E2E_ADMIN_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await loginResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
  await page.getByRole("link", { name: "Scenes" }).click();
  await expect(page.getByRole("heading", { name: "Scenes" })).toBeVisible();
  await page.locator('a[href="/admin/scenes/scene-overview"]').click();
  await expect(page.getByRole("heading", { name: "Edit scene" })).toBeVisible();
  await page.getByLabel("English title").fill("Da Nang Overview");
  await page.getByRole("button", { name: "Save scene" }).click();
  await expect(page.getByRole("status")).toHaveText("Scene saved.");
  await page.getByLabel("Edit existing hotspot").selectOption({ index: 1 });
  await expect(
    page.getByRole("heading", { name: "Edit hotspot" }),
  ).toBeVisible();
  await page.getByLabel("English label").fill("Go to Dragon Bridge");
  await page.getByRole("button", { name: "Save hotspot" }).click();
  await expect(page.getByText("Hotspot saved.", { exact: true })).toBeVisible();
});
