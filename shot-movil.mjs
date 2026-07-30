import { chromium, devices } from "@playwright/test";

// Capturas a tamaño de móvil. Mismo uso que shot.mjs:
//   node shot-movil.mjs /dashboard,/movimientos dark
const RUTAS = process.argv[2]?.split(",") ?? ["/dashboard"];
const TEMA = process.argv[3] ?? "light";
const OUT = process.env.SHOT_OUT ?? ".shots";
const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";

const b = await chromium.launch();
// iPhone 13: 390x844. El caso estrecho de verdad es 375, así que se fuerza.
const ctx = await b.newContext({
  ...devices["iPhone 13"],
  viewport: { width: 375, height: 812 },
});
const p = await ctx.newPage();

p.on("console", (m) => {
  if (m.type() === "error") console.log("  [console]", m.text().slice(0, 200));
});
p.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 300)));

await p.goto(BASE + "/login");
await p.getByLabel(/email/i).fill("demo@hbm.local");
await p.getByLabel(/contraseña/i).fill("Demo1234");
await p.getByRole("button", { name: /entrar|iniciar/i }).click();
await p.waitForURL("**/dashboard", { timeout: 20000 });

if (TEMA === "dark") {
  await p.evaluate(() => localStorage.setItem("hbm-theme", "dark"));
  await p.reload();
}

for (const ruta of RUTAS) {
  await p.goto(BASE + ruta);
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(700);

  // Un desbordamiento horizontal no se ve en la captura pero rompe la página.
  const desborde = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const nombre = ruta.replace(/[^a-z0-9]/gi, "_") || "root";
  const file = `${OUT}/movil-${nombre}-${TEMA}.png`;
  await p.screenshot({ path: file, fullPage: true });
  console.log(desborde > 0 ? `✗ ${file} — DESBORDA ${desborde}px` : `✓ ${file}`);
}

await b.close();
