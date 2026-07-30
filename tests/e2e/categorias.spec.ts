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

  // Categorías de gasto por defecto, madre e hija.
  await expect(page.getByText("Suministros", { exact: true })).toBeVisible();
  await expect(page.getByText("Luz", { exact: true })).toBeVisible();

  // Crear una categoría nueva desde el diálogo.
  await page.getByRole("button", { name: /nueva categoría/i }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("Mascotas");
  await page.getByRole("button", { name: /crear categoría/i }).click();
  await expect(page.getByText("Mascotas", { exact: true })).toBeVisible();

  // Cambiar a ingresos con el conmutador.
  await page.getByRole("radio", { name: /^ingresos$/i }).click();
  await expect(page.getByText("Nómina", { exact: true })).toBeVisible();
});
