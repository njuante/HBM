import { chromium, devices } from "@playwright/test";

const BASE = "http://127.0.0.1:3100";
const ANCHO = Number(process.env.ANCHO ?? 390);
const b = await chromium.launch();
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
await p.waitForTimeout(1500);

const r = await p.evaluate((ANCHO) => {
  const doc = document.documentElement;
  const res = {
    ventana: window.innerWidth,
    desbordePagina: doc.scrollWidth - doc.clientWidth,
    culpables: [],
    contenedoresConScroll: [],
    recortados: [],
  };

  const desc = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 5).join(".")
        : "";
    const txt = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 45);
    return `${el.tagName.toLowerCase()}${cls}${txt ? `  «${txt}»` : ""}`;
  };

  for (const el of document.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // 1. Se sale del ancho de la ventana
    if (rect.right > ANCHO + 1 || rect.left < -1) {
      // solo el más profundo: si el padre ya se sale, no repitas
      const padreTambien =
        el.parentElement &&
        (() => {
          const pr = el.parentElement.getBoundingClientRect();
          return pr.right > ANCHO + 1 || pr.left < -1;
        })();
      if (!padreTambien)
        res.culpables.push({
          que: desc(el),
          izq: Math.round(rect.left),
          der: Math.round(rect.right),
          ancho: Math.round(rect.width),
          sobra: Math.round(rect.right - ANCHO),
        });
    }

    // 2. Contenedores que esconden contenido en horizontal
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 50) {
      const cs = getComputedStyle(el);
      res.contenedoresConScroll.push({
        que: desc(el),
        visible: el.clientWidth,
        real: el.scrollWidth,
        oculto: el.scrollWidth - el.clientWidth,
        overflowX: cs.overflowX,
      });
    }

    // 3. Texto recortado por altura (descuadres típicos)
    if (el.children.length === 0 && el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 0) {
      res.recortados.push({ que: desc(el), visible: el.clientHeight, real: el.scrollHeight });
    }
  }
  return res;
}, ANCHO);

console.log(`\n═══ /dashboard a ${r.ventana}px ═══`);
console.log(`desborde de la página: ${r.desbordePagina}px`);

console.log(`\n── elementos que se salen de la pantalla (${r.culpables.length}) ──`);
for (const c of r.culpables.slice(0, 25))
  console.log(`  sobra ${String(c.sobra).padStart(4)}px  [${c.izq}→${c.der}, ancho ${c.ancho}]  ${c.que}`);

console.log(`\n── contenedores que ocultan contenido a lo ancho (${r.contenedoresConScroll.length}) ──`);
for (const c of r.contenedoresConScroll.slice(0, 15))
  console.log(`  ${String(c.oculto).padStart(4)}px ocultos (${c.visible}→${c.real}, overflow-x:${c.overflowX})  ${c.que}`);

console.log(`\n── contenido recortado en vertical (${r.recortados.length}) ──`);
for (const c of r.recortados.slice(0, 12))
  console.log(`  ${c.visible}px visibles de ${c.real}px  ${c.que}`);

await p.screenshot({ path: `.dash-${ANCHO}.png`, fullPage: true });
console.log(`\ncaptura: .dash-${ANCHO}.png`);
await b.close();
