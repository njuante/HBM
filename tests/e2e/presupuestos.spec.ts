import { test, expect } from "@playwright/test";

test("crear un presupuesto y verlo consumirse con un gasto", async ({ page }) => {
  const email = `e2e_pre_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Pre Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Pre");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Una casa, necesaria para poder apuntar el gasto.
  await page.goto("/casas");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("Casa Pre");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Pre")).toBeVisible();

  // Presupuesto de 100 € para Alimentación.
  await page.goto("/presupuestos");
  await page.getByRole("button", { name: /nuevo presupuesto/i }).first().click();
  await page.getByLabel("Categoría").selectOption({ label: "Alimentación" });
  await page.getByLabel("Límite").fill("100");
  await page.getByRole("button", { name: /crear presupuesto/i }).click();

  await expect(page.getByRole("listitem").filter({ hasText: "Alimentación" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /Alimentación/ })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );

  // Un gasto de 90 € deja el presupuesto en aviso (90 %).
  await page.goto("/movimientos");
  await page.getByRole("button", { name: /^añadir$/i }).first().click();
  await page.getByLabel("Concepto").fill("Compra grande");
  await page.getByLabel(/importe/i).fill("90");
  await page.getByRole("radio", { name: "Alimentación" }).click();
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await expect(page.getByText("Compra grande")).toBeVisible();

  await page.goto("/presupuestos");
  await expect(page.getByRole("progressbar", { name: /Alimentación/ })).toHaveAttribute(
    "aria-valuenow",
    "90",
  );
  await expect(page.getByText(/casi agotado/i)).toBeVisible();

  // Y el panel lo avisa.
  await page.goto("/dashboard");
  await expect(page.getByText(/presupuesto a punto de agotarse/i)).toBeVisible();
});
