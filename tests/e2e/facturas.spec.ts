import { test, expect } from "@playwright/test";

test("subir una factura PDF, verla servida y marcarla pagada", async ({ page }) => {
  const email = `e2e_fac_${Date.now()}@test.com`;

  // Registro
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Fac Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Fac");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Subir factura
  await page.goto("/facturas");
  await page.getByRole("button", { name: /subir factura/i }).first().click();
  await page.locator("#factura-archivo").setInputFiles({
    name: "factura.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nfactura de prueba\n%%EOF"),
  });
  await page.getByLabel("Emisor").fill("Iberdrola");
  await page.getByLabel("Importe").fill("78,30");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /subir factura/i })
    .click();

  await expect(page.getByRole("cell", { name: /iberdrola/i }).first()).toBeVisible();
  await expect(page.getByText(/78,30/)).toBeVisible();

  // Nace pendiente: el estado es un interruptor en la propia fila.
  const pagada = page.getByRole("switch", { name: /marcar iberdrola como pagada/i });
  await expect(pagada).not.toBeChecked();

  // El archivo se sirve por la API autenticada (200 + PDF).
  const href = await page
    .getByRole("link", { name: /abrir archivo de iberdrola/i })
    .first()
    .getAttribute("href");
  expect(href).toContain("/api/facturas/");
  const info = await page.evaluate(async (url) => {
    const r = await fetch(url, { cache: "no-store" });
    return { status: r.status, ct: r.headers.get("content-type") };
  }, href!);
  expect(info.status).toBe(200);
  expect(info.ct).toContain("application/pdf");

  // Marcar como pagada
  await pagada.click();
  await expect(
    page.getByRole("switch", { name: /marcar iberdrola como pagada/i }),
  ).toBeChecked();
});
