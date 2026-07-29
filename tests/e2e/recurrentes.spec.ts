import { test, expect } from "@playwright/test";

test("crear una recurrencia manual y confirmar su propuesta", async ({ page }) => {
  const email = `e2e_rec_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Rec Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Rec");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/casas");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await page.getByLabel("Nombre").fill("Casa Rec");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Rec")).toBeVisible();

  // Recurrencia con fecha pasada y confirmación manual: al recargar debe
  // aparecer en la bandeja de pendientes, no como gasto.
  await page.goto("/recurrentes");
  await page.getByRole("button", { name: /nueva recurrencia/i }).first().click();
  await page.getByLabel("Concepto").fill("Gimnasio");
  await page.getByLabel("Importe").fill("39,90");
  await page.getByRole("radio", { name: "Ocio" }).click();
  await page.getByLabel("Próxima").fill("2026-01-05");
  await page
    .getByRole("switch", { name: /crear el movimiento automáticamente/i })
    .click();
  await page.getByRole("button", { name: /crear recurrencia/i }).click();

  await expect(page.getByText("Gimnasio")).toBeVisible();
  await expect(page.getByText("Confirmar", { exact: true })).toBeVisible();

  // La materialización perezosa corre al abrir el panel.
  await page.goto("/dashboard");
  await expect(page.getByText(/pendientes? de confirmar/i)).toBeVisible();

  await page.getByRole("button", { name: /confirmar gimnasio/i }).first().click();

  // Confirmada, el gasto ya existe y la bandeja se vacía.
  await page.goto("/gastos");
  await expect(page.getByText("Gimnasio")).toBeVisible();
  await expect(page.getByText(/39,90/).first()).toBeVisible();
});

test("un gasto se convierte en recurrencia desde su fila", async ({ page }) => {
  const email = `e2e_conv_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Conv Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Conv");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/casas");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await page.getByLabel("Nombre").fill("Casa Conv");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Conv")).toBeVisible();

  await page.goto("/gastos");
  await page.getByRole("button", { name: /añadir gasto/i }).first().click();
  await page.getByLabel("Concepto").fill("Netflix");
  await page.getByLabel(/importe/i).fill("13,99");
  await page.getByRole("radio", { name: "Ocio" }).click();
  await page.getByRole("button", { name: /guardar gasto/i }).click();
  await expect(page.getByText("Netflix")).toBeVisible();

  await page.getByRole("button", { name: /acciones de netflix/i }).click();
  await page.getByRole("menuitem", { name: /convertir en recurrente/i }).click();

  // Llega a /recurrentes con el diálogo abierto y los datos ya puestos.
  await expect(page).toHaveURL(/\/recurrentes\?desde=/);
  await expect(page.getByLabel("Concepto")).toHaveValue("Netflix");
  await page.getByRole("button", { name: /crear recurrencia/i }).click();

  await expect(page.getByRole("cell", { name: /netflix/i }).first()).toBeVisible();
});
