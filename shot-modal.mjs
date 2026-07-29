import { chromium } from "@playwright/test";

const OUT = process.env.SHOT_OUT ?? ".shots";
const TEMA = process.argv[2] ?? "light";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 400)));
p.on("console", (m) => m.type() === "error" && console.log("  [console]", m.text().slice(0, 300)));

await p.goto("http://localhost:3000/login");
await p.getByLabel(/email/i).fill("demo@hbm.local");
await p.getByLabel(/contraseña/i).fill("Demo1234");
await p.getByRole("button", { name: /entrar|iniciar/i }).click();
await p.waitForURL("**/dashboard", { timeout: 20000 });

if (TEMA === "dark") {
  await p.evaluate(() => localStorage.setItem("hbm-theme", "dark"));
}

await p.goto("http://localhost:3000/gastos");
await p.waitForLoadState("networkidle").catch(() => {});
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/lista-gastos-${TEMA}.png`, fullPage: true });
console.log("✓ lista");

await p.getByRole("button", { name: /añadir gasto/i }).first().click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/modal-gasto-${TEMA}.png` });
console.log("✓ modal cerrado-inicial");

// Abrir "Más detalles" para ver el modal completo
await p.getByRole("button", { name: /más detalles/i }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/modal-gasto-detalles-${TEMA}.png` });
console.log("✓ modal con detalles");

await b.close();
