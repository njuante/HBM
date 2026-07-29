import { test, expect } from "@playwright/test";

/**
 * Recorrido completo del módulo de alquileres, con el foco puesto en la
 * frontera: el inquilino entra a su panel y **no** alcanza nada más.
 */
test("el inquilino solo ve su panel y las facturas que le comparten", async ({
  browser,
}) => {
  const sello = Date.now();
  const owner = `e2e_prop_${sello}@test.com`;
  const inquilino = `e2e_inqui_${sello}@test.com`;

  const ctxOwner = await browser.newContext();
  const pageOwner = await ctxOwner.newPage();

  // ── Propietario ────────────────────────────────────────────────────────
  await pageOwner.goto("/registro");
  await pageOwner.getByLabel("Tu nombre").fill("Propietario");
  await pageOwner.getByLabel(/nombre de la familia/i).fill("Familia Alq");
  await pageOwner.getByLabel("Email").fill(owner);
  await pageOwner.getByLabel("Contraseña").fill("Password123");
  await pageOwner.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(pageOwner).toHaveURL(/\/dashboard/);

  // El módulo nace apagado: no hay pestaña de alquileres.
  await expect(pageOwner.getByRole("link", { name: "Alquileres" })).toHaveCount(0);

  await pageOwner.goto("/familia");
  await pageOwner
    .getByRole("switch", { name: /activar el módulo de alquileres/i })
    .click();
  await expect(pageOwner.getByRole("link", { name: "Alquileres" })).toBeVisible();

  // Dos casas: la que se alquila y otra que no.
  await pageOwner.goto("/casas");
  for (const nombre of ["Piso alquilado", "Nuestra casa"]) {
    await pageOwner.getByRole("button", { name: /añadir casa/i }).first().click();
    await pageOwner.getByLabel("Nombre").fill(nombre);
    await pageOwner.getByRole("button", { name: /crear casa/i }).click();
    await expect(pageOwner.getByText(nombre)).toBeVisible();
  }

  // Contrato de alquiler.
  await pageOwner.goto("/alquileres");
  await pageOwner.getByRole("button", { name: /nuevo contrato/i }).first().click();
  await pageOwner.getByLabel("Casa").selectOption({ label: "Piso alquilado" });
  await pageOwner.getByLabel("Inquilino").fill("Inquilino Tester");
  await pageOwner.getByLabel("Su email").fill(inquilino);
  await pageOwner.getByLabel("Renta mensual").fill("750");
  await pageOwner.getByRole("button", { name: /crear contrato/i }).click();
  await expect(pageOwner.getByText("Inquilino Tester")).toBeVisible();

  // Dos facturas: una se comparte, la otra no.
  await pageOwner.goto("/facturas");
  for (const [emisor, casa] of [
    ["Endesa", "Piso alquilado"],
    ["Reforma", "Piso alquilado"],
  ]) {
    await pageOwner.getByRole("button", { name: /subir factura/i }).first().click();
    await pageOwner.locator("#factura-archivo").setInputFiles({
      name: `${emisor}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\n${emisor}\n%%EOF`),
    });
    await pageOwner.getByLabel("Emisor").fill(emisor);
    await pageOwner.getByLabel("Casa").selectOption({ label: casa });
    await pageOwner.getByRole("button", { name: /guardar factura/i }).click();
    await expect(pageOwner.getByText(emisor)).toBeVisible();
  }

  await pageOwner.getByRole("button", { name: /acciones de endesa/i }).click();
  await pageOwner
    .getByRole("menuitem", { name: /compartir con el inquilino/i })
    .click();

  // Enlace de acceso al portal.
  await pageOwner.goto("/alquileres");
  await pageOwner.getByRole("button", { name: /acciones de piso alquilado/i }).click();
  await pageOwner.getByRole("menuitem", { name: /dar acceso al portal/i }).click();
  await pageOwner.getByRole("button", { name: /generar enlace/i }).click();
  const enlace = await pageOwner
    .getByLabel("Enlace de acceso al portal")
    .inputValue();

  // ── Inquilino ──────────────────────────────────────────────────────────
  const ctxInq = await browser.newContext();
  const pageInq = await ctxInq.newPage();

  await pageInq.goto(enlace.replace(/^https?:\/\/[^/]+/, ""));
  await pageInq.getByLabel("Tu nombre").fill("Inquilino Tester");
  await pageInq.getByLabel("Contraseña").fill("Password123");
  await pageInq.getByRole("button", { name: /crear cuenta y entrar/i }).click();

  // Aunque el alta redirige al panel de la app, el DAL lo manda a su portal.
  await expect(pageInq).toHaveURL(/\/portal/);
  await expect(pageInq.getByText("Piso alquilado")).toBeVisible();
  await expect(pageInq.getByText(/750,00/)).toBeVisible();

  // Ve la compartida y no la otra.
  await expect(pageInq.getByText("Endesa")).toBeVisible();
  await expect(pageInq.getByText("Reforma")).toHaveCount(0);

  // Declarar el pago no la marca como pagada: lo confirma el propietario.
  await pageInq.getByRole("button", { name: /ya lo he pagado/i }).click();
  await expect(pageInq.getByText(/pago avisado/i)).toBeVisible();

  // Y no llega a ninguna ruta de la familia.
  for (const ruta of ["/dashboard", "/gastos", "/facturas", "/alquileres"]) {
    await pageInq.goto(ruta);
    await expect(pageInq).toHaveURL(/\/portal/);
  }

  await ctxOwner.close();
  await ctxInq.close();
});
