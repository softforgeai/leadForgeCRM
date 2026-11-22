import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the live demo" }).click();
  // Generous timeout: the first request on a serverless host can be a cold start.
  await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
}

test("landing page explains the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Stop losing leads");
});

test("signed-out visitors are redirected away from the app", async ({ page }) => {
  await page.goto("/app/leads");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fleads/);
});

test("demo login shows the dashboard with data", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
});

test("a lead can be created, noted and moved", async ({ page }) => {
  await openDemo(page);
  const name = `E2E Lead ${Date.now()}`;

  await page.goto("/app/leads/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Company").fill("Playwright Testing Co");
  await page.getByLabel("Estimated deal value (USD)").fill("4,200");
  await page.getByRole("button", { name: "Create lead" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.getByPlaceholder("Add a note").fill("Created by the end-to-end test.");
  await page.getByRole("button", { name: "Add to timeline" }).click();
  await expect(page.getByText("Created by the end-to-end test.")).toBeVisible();

  await page.goto("/app/pipeline");
  await page.getByRole("button", { name: `Move ${name} to stage` }).click();
  await page.getByRole("menuitem", { name: "Qualified" }).click();
  await expect(page.getByRole("region", { name: /^Qualified/ }).getByRole("link", { name })).toBeVisible();
});

test("lead search escapes filter syntax", async ({ page }) => {
  await openDemo(page);
  await page.goto("/app/leads?q=" + encodeURIComponent("x),id.neq.0,(name"));
  await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  await expect(page.getByText("No contacts match these filters")).toBeVisible();
});

test("unknown public form links show not found and reveal nothing", async ({ page }) => {
  // The page streams, so the HTTP status is sent before the lookup finishes;
  // what matters is that no form or workspace details are shown.
  await page.goto("/f/" + "0".repeat(32));
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toHaveCount(0);
});

test("public icons and share image are served to signed-out visitors", async ({ request }) => {
  for (const path of ["/icon.svg", "/apple-icon", "/opengraph-image", "/manifest.webmanifest"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
  }
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});
