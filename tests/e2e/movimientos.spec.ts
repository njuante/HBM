import { test, expect } from "@playwright/test";

test("crear casa, gasto e ingreso y ver los totales", async ({ page }) => {
  const email = `e2e_mov_${Date.now()}@test.com`;

  // Registro
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Mov Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Mov");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Casa (necesaria para un gasto)
  await page.goto("/casas");
  await page.getByLabel("Nombre", { exact: true }).fill("Casa E2E");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await expect(page.getByText("Casa E2E")).toBeVisible();

  // Gasto
  await page.goto("/gastos");
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await page.getByLabel("Concepto").fill("Compra test");
  await page.getByLabel(/importe/i).fill("42.50");
    await page.getByRole("radio", { name: "Alimentación" }).click();
  await page.getByRole("button", { name: /guardar gasto/i }).click();

  await expect(page.getByText("Compra test")).toBeVisible();
  await expect(page.getByText(/42,50/).first()).toBeVisible();

  // Ingreso
  await page.goto("/ingresos");
  await page.getByRole("button", { name: /añadir ingreso/i }).click();
  await page.getByLabel("Concepto").fill("Nómina test");
  await page.getByLabel(/importe/i).fill("1000");
  await page.getByRole("radio", { name: "Nómina" }).click();
  await page.getByRole("button", { name: /guardar ingreso/i }).click();

  await expect(page.getByText("Nómina test")).toBeVisible();
  await expect(page.getByText(/1\.000,00|1000,00/).first()).toBeVisible();
});
