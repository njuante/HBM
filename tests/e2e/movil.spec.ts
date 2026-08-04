import { test, expect, type Page } from "@playwright/test";

/**
 * Lo que aquí se comprueba estaba roto en móvil:
 *  - las acciones de fila vivían tras `:hover`, que en táctil no existe;
 *  - la tabla de movimientos sacaba el importe fuera de la pantalla;
 *  - la paleta de comandos no tenía ningún disparador visible.
 *
 * El proyecto «movil» de playwright.config.ts corre sin hover y a 375 px.
 */

async function registrarse(page: Page, prefijo: string) {
  const email = `e2e_${prefijo}_${Date.now()}@test.com`;
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Movil Tester");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Movil");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("Password123");
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Un gasto necesita una casa: sin ella el diálogo no ofrece el formulario. */
async function crearCasa(page: Page) {
  await page.goto("/casas");
  await page
    .getByRole("button", { name: /añadir casa/i })
    .first()
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Casa Movil");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Casa Movil")).toBeVisible();
}

async function crearGasto(page: Page, concepto: string, importe: string) {
  await page.goto("/movimientos");
  // En móvil el alta es el botón redondo de la cabecera: no lleva rótulo
  // visible, así que se busca por su nombre accesible.
  await page.getByRole("button", { name: /añadir movimiento/i }).click();
  await page.getByLabel("Concepto").fill(concepto);
  await page.getByLabel(/importe/i).fill(importe);
  await page.getByRole("radio", { name: "Alimentación" }).click();
  await page.getByRole("button", { name: /añadir gasto/i }).click();
  await expect(page.getByText(concepto).first()).toBeVisible();
}

test("se puede editar y borrar un movimiento sin hover", async ({ page }) => {
  await registrarse(page, "acciones");
  await crearCasa(page);
  await crearGasto(page, "Compra movil", "12,00");

  // El menú de acciones tiene que estar a la vista, no tras el cursor.
  const acciones = page.getByRole("button", { name: /acciones de compra movil/i }).first();
  await expect(acciones).toBeVisible();

  // Editar: la hoja de acciones sustituye al menú desplegable de la tabla.
  await acciones.click();
  await page.getByRole("button", { name: /^editar$/i }).click();
  await page.getByLabel("Concepto").fill("Compra editada");
  await page.getByRole("button", { name: /guardar/i }).click();
  await expect(page.getByText("Compra editada").first()).toBeVisible();

  // Borrar
  await page
    .getByRole("button", { name: /acciones de compra editada/i })
    .first()
    .click();
  // Sin diálogo de confirmación: la hoja marca «Eliminar» en rojo y el aviso
  // que sale después deja deshacerlo, que es el patrón de una app táctil.
  await page.getByRole("button", { name: /^eliminar$/i }).click();

  // Sobre el botón de la fila y no sobre el texto: el aviso de «eliminado»
  // también contiene el concepto y nunca daría cero.
  await expect(
    page.getByRole("button", { name: /acciones de compra editada/i }),
  ).toHaveCount(0);
});

test("el importe se lee sin desplazarse en horizontal", async ({ page }) => {
  await registrarse(page, "importe");
  await crearCasa(page);
  await crearGasto(page, "Gasto visible", "33,00");

  const importe = page.getByText("−33,00 €").first();
  await expect(importe).toBeVisible();

  // Visible de verdad: dentro del ancho de la ventana, no solo en el DOM.
  const caja = await importe.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(375);
});

test("la búsqueda es alcanzable con el dedo", async ({ page }) => {
  await registrarse(page, "paleta");
  // Ya no hay lupa en una cabecera web: en móvil buscar vive en «Más», que es
  // donde se recogieron las acciones al retirar la cabecera de escritorio.
  await page.getByRole("button", { name: /más secciones/i }).click();
  await page.getByRole("button", { name: /^buscar$/i }).click();
  await expect(page.getByPlaceholder(/busca un movimiento/i)).toBeVisible();
});

test("ninguna pantalla desborda a lo ancho", async ({ page }) => {
  await registrarse(page, "desborde");

  for (const ruta of [
    "/dashboard",
    "/movimientos",
    "/facturas",
    "/presupuestos",
    "/recurrentes",
    "/categorias",
    "/ahorro",
    "/casas",
    "/familia",
  ]) {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle").catch(() => {});
    const desborde = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(desborde, `${ruta} desborda ${desborde}px`).toBeLessThanOrEqual(0);
  }
});
