import { test, expect } from "@playwright/test";

test("crear casa, gasto e ingreso y ver el saldo", async ({ page }) => {
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
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("Casa E2E");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa E2E")).toBeVisible();

  // Gasto e ingreso, desde la misma pantalla y el mismo botón.
  await page.goto("/movimientos");
  await page.getByRole("button", { name: /^añadir$/i }).first().click();
  await page.getByLabel("Concepto").fill("Compra test");
  await page.getByLabel(/importe/i).fill("42,50");
  await page.getByRole("radio", { name: "Alimentación" }).click();
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await expect(page.getByText("Compra test")).toBeVisible();

  await page.getByRole("button", { name: /^añadir$/i }).first().click();
  await page.getByRole("radio", { name: "Ingreso" }).click();
  await page.getByLabel("Concepto").fill("Nómina test");
  await page.getByLabel(/importe/i).fill("1000");
  await page.getByRole("radio", { name: "Nómina" }).click();
  await page.getByRole("button", { name: /añadir ingreso/i }).click();
  await expect(page.getByText("Nómina test")).toBeVisible();

  // El saldo de la cabecera es la resta de los dos.
  await expect(page.getByText(/957,50/).first()).toBeVisible();

  // Los filtros por tipo dejan ver cada lado por separado.
  await page.getByRole("radio", { name: "Ingresos" }).click();
  await expect(page.getByText("Nómina test")).toBeVisible();
  await expect(page.getByText("Compra test")).toHaveCount(0);
});

test("las rutas antiguas siguen llevando al sitio correcto", async ({ page }) => {
  const email = `e2e_red_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Red Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Red");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // El panel enlaza a /gastos?categoriaId=… desde la gráfica de reparto.
  await page.goto("/gastos?categoriaId=abc");
  await expect(page).toHaveURL(/\/movimientos\?.*tipo=GASTO/);
  await expect(page).toHaveURL(/categoriaId=abc/);

  await page.goto("/ingresos");
  await expect(page).toHaveURL(/\/movimientos\?tipo=INGRESO/);
});
