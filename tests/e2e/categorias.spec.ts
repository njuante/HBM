import { test, expect } from "@playwright/test";

async function registrar(page: import("@playwright/test").Page) {
  const email = `e2e_cat_${Date.now()}@test.com`;
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Cat Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Cat");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("categorías por defecto y alta de una nueva", async ({ page }) => {
  await registrar(page);
  await page.goto("/categorias");

  // Categorías de gasto por defecto (span de la lista, no la opción del select)
  await expect(
    page.locator("span.font-medium", { hasText: "Suministros" }),
  ).toBeVisible();
  await expect(
    page.locator("span.font-medium", { hasText: "Luz" }),
  ).toBeVisible();

  // Crear una categoría nueva
  await page.getByLabel(/nueva categoría de gasto/i).fill("Mascotas");
  await page.getByRole("button", { name: /^añadir$/i }).click();
  await expect(
    page.locator("span.font-medium", { hasText: "Mascotas" }),
  ).toBeVisible();

  // Cambiar a ingresos
  await page.getByRole("button", { name: /^ingresos$/i }).click();
  await expect(
    page.locator("span.font-medium", { hasText: "Nómina" }),
  ).toBeVisible();
});
