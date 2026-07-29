import { chromium } from "@playwright/test";

const RUTAS = process.argv[2]?.split(",") ?? ["/dashboard"];
const TEMA = process.argv[3] ?? "light";
// Directorio de salida: SHOT_OUT o ./.shots (gitignorado).
const OUT = process.env.SHOT_OUT ?? ".shots";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();

p.on("console", (m) => {
  if (m.type() === "error") console.log("  [console]", m.text().slice(0, 200));
});
p.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 300)));

await p.goto("http://localhost:3000/login");
await p.getByLabel(/email/i).fill("demo@hbm.local");
await p.getByLabel(/contraseña/i).fill("Demo1234");
await p.getByRole("button", { name: /entrar|iniciar/i }).click();
await p.waitForURL("**/dashboard", { timeout: 20000 });

if (TEMA === "dark") {
  await p.evaluate(() => localStorage.setItem("hbm-theme", "dark"));
  await p.reload();
}

for (const ruta of RUTAS) {
  await p.goto("http://localhost:3000" + ruta);
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(700);
  const nombre = ruta.replace(/[^a-z0-9]/gi, "_") || "root";
  const file = `${OUT}/${nombre}-${TEMA}.png`;
  await p.screenshot({ path: file, fullPage: true });
  console.log("✓", file);
}

await b.close();
