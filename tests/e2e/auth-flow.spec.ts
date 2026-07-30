import { test, expect } from "@playwright/test";

// Flujo completo: registro, panel, casas, familia, logout y login.
test("registro → panel → casas → familia → logout → login", async ({ page }) => {
  const email = `e2e_${Date.now()}@test.com`;
  const password = "Password123";

  // Registro
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Juan Test");
  await page.getByLabel(/nombre de la familia/i).fill("Familia Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /crear cuenta/i }).click();

  // Panel
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /^panel$/i })).toBeVisible();

  // Alta de casa: el formulario vive en un diálogo, así que primero se abre.
  await page.goto("/casas");
  await page.getByRole("button", { name: /añadir casa/i }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("Piso Test");
  await page.getByRole("button", { name: /crear casa/i }).click();
  await expect(page.getByText("Piso Test")).toBeVisible();

  // Familia: el usuario aparece como propietario.
  await page.goto("/familia");
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Propietario").first()).toBeVisible();

  // Logout, desde el menú de usuario.
  await page.getByRole("button", { name: /^cuenta de /i }).click();
  await page.getByRole("menuitem", { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/login/);

  // Login de nuevo
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

// El chequeo optimista del proxy protege las rutas privadas.
test("una ruta protegida sin sesión redirige a login", async ({ page }) => {
  await page.goto("/casas");
  await expect(page).toHaveURL(/\/login/);
});
