import { test, expect } from "@playwright/test";

test("invitar por enlace, crear cuenta desde él y entrar en la familia", async ({
  browser,
}) => {
  const sello = Date.now();
  const owner = `e2e_own_${sello}@test.com`;
  const invitado = `e2e_inv_${sello}@test.com`;

  // ── Propietario: crea la familia y genera el enlace ────────────────────
  const ctxOwner = await browser.newContext();
  const pageOwner = await ctxOwner.newPage();

  await pageOwner.goto("/registro");
  await pageOwner.getByLabel("Tu nombre").fill("Owner Tester");
  await pageOwner.getByLabel(/nombre de la familia/i).fill("Familia Inv");
  await pageOwner.getByLabel("Email").fill(owner);
  await pageOwner.getByLabel("Contraseña").fill("Password123");
  await pageOwner.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(pageOwner).toHaveURL(/\/dashboard/);

  await pageOwner.goto("/familia");
  await pageOwner.getByRole("button", { name: /invitar/i }).click();
  await pageOwner.getByLabel("Email").fill(invitado);
  await pageOwner.getByRole("button", { name: /crear invitación/i }).click();

  const enlace = await pageOwner
    .getByLabel("Enlace de invitación")
    .inputValue();
  expect(enlace).toContain("/invitacion/");

  // El enlace queda listado como pendiente y se puede revocar.
  await pageOwner.getByRole("button", { name: /hecho/i }).click();
  await expect(pageOwner.getByText(invitado)).toBeVisible();

  // ── Invitado: abre el enlace en otro navegador y se da de alta ─────────
  const ctxInvitado = await browser.newContext();
  const pageInv = await ctxInvitado.newPage();

  await pageInv.goto(enlace.replace(/^https?:\/\/[^/]+/, ""));
  await expect(pageInv.getByText(/te han invitado a familia inv/i)).toBeVisible();

  await pageInv.getByLabel("Tu nombre").fill("Invitado Tester");
  await pageInv.getByLabel("Contraseña").fill("Password123");
  await pageInv.getByRole("button", { name: /crear cuenta y entrar/i }).click();
  await expect(pageInv).toHaveURL(/\/dashboard/);

  // Está dentro de la familia del propietario, no de una suya.
  await pageInv.goto("/familia");
  await expect(pageInv.getByText(owner)).toBeVisible();
  await expect(pageInv.getByText("Invitado Tester")).toBeVisible();

  // El enlace ya no sirve una segunda vez.
  const ctxTercero = await browser.newContext();
  const pageTercero = await ctxTercero.newPage();
  await pageTercero.goto(enlace.replace(/^https?:\/\/[^/]+/, ""));
  await expect(pageTercero.getByText(/invitación no válida/i)).toBeVisible();

  await ctxOwner.close();
  await ctxInvitado.close();
  await ctxTercero.close();
});

test("cambiar el nombre del perfil se refleja en la familia", async ({ page }) => {
  const email = `e2e_perfil_${Date.now()}@test.com`;

  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Nombre Viejo");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Perfil");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/ajustes/perfil");
  await page.getByRole("textbox", { name: "Nombre" }).fill("Nombre Nuevo");
  await page.getByRole("button", { name: /^guardar$/i }).click();
  await expect(page.getByText(/perfil actualizado/i)).toBeVisible();

  await page.goto("/familia");
  await expect(page.getByText("Nombre Nuevo")).toBeVisible();
});
