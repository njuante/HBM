import { test, expect } from "@playwright/test";

test("el panel muestra KPIs y gráficas tras registrar movimientos", async ({ page }) => {
  const email = `e2e_dash_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Dash Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Dash");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Casa + gasto + ingreso
  await page.goto("/casas");
  await page.getByLabel("Nombre", { exact: true }).fill("Casa Dash");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await expect(page.getByText("Casa Dash")).toBeVisible();

  await page.goto("/gastos");
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await page.getByLabel("Concepto").fill("Compra dash");
  await page.getByLabel(/importe/i).fill("42.50");
    await page.getByRole("radio", { name: "Alimentación" }).click();
  await page.getByRole("button", { name: /guardar gasto/i }).click();
  await expect(page.getByText("Compra dash")).toBeVisible();

  await page.goto("/ingresos");
  await page.getByRole("button", { name: /añadir ingreso/i }).click();
  await page.getByLabel("Concepto").fill("Nómina dash");
  await page.getByLabel(/importe/i).fill("1000");
  await page.getByRole("radio", { name: "Nómina" }).click();
  await page.getByRole("button", { name: /guardar ingreso/i }).click();
  await expect(page.getByText("Nómina dash")).toBeVisible();

  // Panel
  await page.goto("/dashboard");
  // Saldo = 1000 - 42,50 = 957,50
  await expect(page.getByText(/957,50/)).toBeVisible();
  // Se renderiza al menos una gráfica (Recharts)
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
});
