import { chromium } from "@playwright/test";
const OUT = process.env.SHOT_OUT ?? ".shots";
const TEMA = process.argv[2] ?? "light";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

await p.goto("http://localhost:3000/login");
await p.getByLabel(/email/i).fill("demo@hbm.local");
await p.getByLabel(/contraseña/i).fill("Demo1234");
await p.getByRole("button", { name: /entrar|iniciar/i }).click();
await p.waitForURL("**/dashboard", { timeout: 20000 });
if (TEMA === "dark") {
  await p.evaluate(() => localStorage.setItem("hbm-theme", "dark"));
  await p.reload();
}

const casos = [
  ["/movimientos", /^añadir$/i, "dialogo-movimiento"],
  ["/recurrentes", /nueva recurrencia/i, "dialogo-recurrencia"],
  ["/facturas", /subir factura/i, "dialogo-factura"],
  ["/presupuestos", /nuevo presupuesto/i, "dialogo-presupuesto"],
  ["/alquileres", /nuevo contrato/i, "dialogo-contrato"],
];

for (const [ruta, boton, nombre] of casos) {
  await p.goto("http://localhost:3000" + ruta);
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.getByRole("button", { name: boton }).first().click();
  await p.waitForTimeout(600);
  const file = `${OUT}/${nombre}-${TEMA}.png`;
  await p.screenshot({ path: file });
  console.log("✓", nombre);
}
await b.close();
