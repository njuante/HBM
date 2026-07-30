import { test, expect } from "@playwright/test";

test("una factura vencida pendiente genera alerta en el panel", async ({ page }) => {
  const email = `e2e_alr_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Alr Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Alr");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Subir factura pendiente con vencimiento pasado
  await page.goto("/facturas");
  await page.getByRole("button", { name: /subir factura/i }).first().click();
  await page.locator("#factura-archivo").setInputFiles({
    name: "endesa.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nvencida\n%%EOF"),
  });
  await page.getByLabel("Emisor").fill("Endesa");
  await page.getByLabel("Vencimiento").fill("2020-01-15");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /subir factura/i })
    .click();
  // Acotado a la tabla: en el diálogo el nombre del archivo también dice
  // «endesa» y `getByText` casa por subcadena.
  await expect(page.getByRole("cell", { name: /endesa/i }).first()).toBeVisible();

  // El panel muestra la alerta de factura vencida
  await page.goto("/dashboard");
  await expect(page.getByText(/factura vencida sin pagar/i)).toBeVisible();
  await expect(page.getByText(/Endesa/)).toBeVisible();
});
