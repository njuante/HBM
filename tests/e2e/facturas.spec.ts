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
  await page.getByRole("button", { name: /guardar factura/i }).click();

  // Aparece la tarjeta con el badge de estado (span, no la opción del filtro)
  await expect(page.getByText("Iberdrola")).toBeVisible();
  await expect(
    page.locator("span.rounded-full", { hasText: /pendiente/i }).first(),
  ).toBeVisible();

  // El archivo se sirve por la API autenticada (200 + PDF)
  const href = await page.getByRole("link", { name: /ver archivo/i }).first().getAttribute("href");
  expect(href).toContain("/api/facturas/");
  const info = await page.evaluate(async (url) => {
    const r = await fetch(url, { cache: "no-store" });
    return { status: r.status, ct: r.headers.get("content-type") };
  }, href!);
  expect(info.status).toBe(200);
  expect(info.ct).toContain("application/pdf");

  // Marcar como pagada
  await page.getByRole("button", { name: /marcar pagada/i }).click();
  await expect(
    page.locator("span.rounded-full", { hasText: /pagada/i }).first(),
  ).toBeVisible();
});
