// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  kpisDashboard,
  resumenMensual,
  gastosPorCategoria,
} from "@/server/db/dashboard";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";

const S = `dash_${Date.now()}`;
let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;
let catA: string;
let catB: string;
let catIngreso: string;

const desde = new Date("2026-01-01");
const hasta = new Date("2026-12-31T23:59:59");
const rango = { desde, hasta };

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;
  userId = (
    await prisma.user.create({
      data: { nombre: "U", email: `u_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  casaId = (await prisma.casa.create({ data: { familiaId: fam, nombre: "Casa" } })).id;
  await crearCategoriasPorDefecto(fam);
  const cats = await listCategorias(fam, TipoCategoria.GASTO);
  catA = cats[0].id;
  catB = cats[1].id;
  catIngreso = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;

  // Gastos: 100 (catA, marzo), 40 (catB, marzo), 60 (catA, abril)
  await prisma.gasto.createMany({
    data: [
      { familiaId: fam, casaId, categoriaId: catA, usuarioId: userId, importe: "100.00", fecha: new Date("2026-03-10"), concepto: "g1" },
      { familiaId: fam, casaId, categoriaId: catB, usuarioId: userId, importe: "40.00", fecha: new Date("2026-03-15"), concepto: "g2" },
      { familiaId: fam, casaId, categoriaId: catA, usuarioId: userId, importe: "60.00", fecha: new Date("2026-04-05"), concepto: "g3" },
    ],
  });
  // Ingresos: 500 (marzo)
  await prisma.ingreso.create({
    data: { familiaId: fam, casaId, categoriaId: catIngreso, usuarioId: userId, importe: "500.00", fecha: new Date("2026-03-01"), concepto: "i1" },
  });
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("kpis", () => {
  it("suma ingresos, gastos y calcula el saldo", async () => {
    const k = await kpisDashboard(fam, rango);
    expect(k.gastos).toBe(200);
    expect(k.ingresos).toBe(500);
    expect(k.saldo).toBe(300);
  });

  it("otra familia tiene KPIs a cero (aislamiento)", async () => {
    const k = await kpisDashboard(otraFam, rango);
    expect(k.gastos).toBe(0);
    expect(k.ingresos).toBe(0);
  });
});

describe("resumen mensual", () => {
  it("agrupa por mes con huecos a cero", async () => {
    const serie = await resumenMensual(fam, rango);
    expect(serie.length).toBe(12); // enero..diciembre
    const marzo = serie.find((p) => p.mes === "2026-03")!;
    const abril = serie.find((p) => p.mes === "2026-04")!;
    const enero = serie.find((p) => p.mes === "2026-01")!;
    expect(marzo.gastos).toBe(140);
    expect(marzo.ingresos).toBe(500);
    expect(abril.gastos).toBe(60);
    expect(enero.gastos).toBe(0);
  });
});

describe("gastos por categoría", () => {
  it("agrupa y ordena por total descendente", async () => {
    const cats = await gastosPorCategoria(fam, rango);
    expect(cats.length).toBe(2);
    expect(cats[0].total).toBe(160); // catA: 100 + 60
    expect(cats[1].total).toBe(40); // catB
    expect(cats[0].total).toBeGreaterThan(cats[1].total);
  });

  it("respeta el filtro de casa inexistente", async () => {
    const cats = await gastosPorCategoria(fam, { ...rango, casaId: "otra-casa-id" });
    expect(cats.length).toBe(0);
  });
});
