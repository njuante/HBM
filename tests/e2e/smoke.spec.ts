import { test, expect } from "@playwright/test";

test("la landing carga y muestra los accesos", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /controla los gastos/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /crear cuenta/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /iniciar sesión/i }),
  ).toBeVisible();
});
