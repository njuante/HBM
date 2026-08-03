import { chromium, devices } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const b = await chromium.launch();

for (const ANCHO of [320, 360, 390]) {
  const ctx = await b.newContext({
    ...devices["iPhone 13"],
    viewport: { width: ANCHO, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const p = await ctx.newPage();
  await p.goto(BASE + "/login");
  await p.getByLabel(/email/i).fill("demo@hbm.local");
  await p.getByLabel(/contraseña/i).fill("Demo1234");
  await p.getByRole("button", { name: /entrar|iniciar/i }).click();
  await p.waitForURL("**/dashboard", { timeout: 30000 });
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(1200);

  const m = await p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const caja = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), der: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
    };
    // Altura total del bloque de KPIs
    const kpiGrid = document.querySelector("div.grid.gap-3");
    // Filas de presupuesto: busca textos con " / "
    const filas = [...document.querySelectorAll("*")]
      .filter((e) => e.children.length === 0 && / \/ /.test(e.textContent || ""))
      .map((e) => {
        const r = e.getBoundingClientRect();
        return {
          txt: e.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
          der: Math.round(r.right),
          sobra: Math.round(r.right - window.innerWidth),
        };
      });
    return {
      ventana: window.innerWidth,
      alturaTotal: document.documentElement.scrollHeight,
      kpiBloque: caja(kpiGrid),
      tarjetasKpi: [...document.querySelectorAll("div.grid.gap-3 > *")].slice(0, 4).map(caja),
      filasPresupuesto: filas.slice(0, 6),
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log(`\n═══ ${ANCHO}px ═══`);
  console.log(`  alto total de la página: ${m.alturaTotal}px (${(m.alturaTotal / 844).toFixed(1)} pantallas)`);
  console.log(`  bloque de KPIs: ${m.kpiBloque?.h}px de alto  → ${m.tarjetasKpi.length} tarjetas de ${m.tarjetasKpi[0]?.w}x${m.tarjetasKpi[0]?.h}`);
  console.log(`  desborde horizontal: ${m.desborde}px`);
  for (const f of m.filasPresupuesto)
    console.log(`  fila «${f.txt}» acaba en x=${f.der} ${f.sobra > 0 ? `→ SE SALE ${f.sobra}px` : ""}`);

  await p.screenshot({ path: `.dash-${ANCHO}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
