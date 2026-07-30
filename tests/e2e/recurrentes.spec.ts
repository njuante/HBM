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
  await page.getByLabel("Nombre", { exact: true }).fill("Casa Rec");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Rec")).toBeVisible();

  // Recurrencia con fecha pasada y confirmación manual: al recargar debe
  // aparecer en la bandeja de pendientes, no como gasto.
  await page.goto("/recurrentes");
  await page.getByRole("button", { name: /nueva recurrencia/i }).first().click();
  await page.getByLabel("Concepto").fill("Gimnasio");
  await page.getByLabel("Importe").fill("39,90");
  await page.getByRole("radio", { name: "Ocio" }).click();
  // La primera fecha y el modo manual viven en «Más opciones».
  await page.getByRole("button", { name: /más opciones/i }).click();
  await page.getByLabel("Primera vez").fill("2026-01-05");
  await page
    .getByRole("switch", { name: /apuntarlo autom/i })
    .click();
  await page.getByRole("button", { name: /crear recurrencia/i }).click();

  await expect(page.getByText("Gimnasio")).toBeVisible();
  await expect(page.getByText("Confirmar", { exact: true })).toBeVisible();

  // La materialización perezosa corre al abrir el panel, que lo anuncia; la
  // bandeja donde se confirman vive en /recurrentes.
  await page.goto("/dashboard");
  await expect(page.getByText(/pendientes? de confirmar/i)).toBeVisible();

  await page.goto("/recurrentes");
  // La recurrencia arranca en enero, así que hay una propuesta por cada mes
  // transcurrido. Se confirma una sola.
  const porConfirmar = page.getByRole("button", { name: /confirmar gimnasio/i });
  // `count()` no espera; hay que dejar que la bandeja se pinte antes de pulsar.
  await expect(porConfirmar.first()).toBeVisible();
  await porConfirmar.first().click();

  // Lo que importa es el resultado: el gasto acaba existiendo. No se afirma
  // sobre cuántas propuestas quedan, porque la materialización perezosa corre
  // en cada carga y puede reponer la lista mientras tanto; y `click()` vuelve
  // al enviar la acción, no al terminarla, así que se reintenta la recarga.
  await expect(async () => {
    await page.goto("/movimientos");
    await expect(
      page.getByText("Gimnasio").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });

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
  await page.getByLabel("Nombre", { exact: true }).fill("Casa Conv");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Conv")).toBeVisible();

  await page.goto("/movimientos");
  await page.getByRole("button", { name: /^añadir$/i }).first().click();
  await page.getByLabel("Concepto").fill("Netflix");
  await page.getByLabel(/importe/i).fill("13,99");
  await page.getByRole("radio", { name: "Ocio" }).click();
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await expect(page.getByText("Netflix").filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /acciones de netflix/i }).click();
  await page.getByRole("menuitem", { name: /convertir en recurrente/i }).click();

  // Llega a /recurrentes con el diálogo abierto y los datos ya puestos.
  await expect(page).toHaveURL(/\/recurrentes\?desde=/);
  await expect(page.getByLabel("Concepto")).toHaveValue("Netflix");
  await page.getByRole("button", { name: /crear recurrencia/i }).click();

  await expect(page.getByRole("cell", { name: /netflix/i }).first()).toBeVisible();
});
