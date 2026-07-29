// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listPresupuestos,
  crearPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
  resumenPresupuestos,
  mediaGastoMensual,
} from "@/server/db/presupuestos";
import { crearGasto } from "@/server/db/gastos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";
import { primerDiaDeMes } from "@/lib/periodo";

const S = `pre_${Date.now()}`;
const MES = "2026-04";

let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;
let otraCasaId: string;
let catConSub: string;
let subId: string;
let otraCat: string;

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;
  userId = (
    await prisma.user.create({
      data: { nombre: "U", email: `u_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  casaId = (await prisma.casa.create({ data: { familiaId: fam, nombre: "Casa" } })).id;
  otraCasaId = (
    await prisma.casa.create({ data: { familiaId: otraFam, nombre: "Otra" } })
  ).id;

  await crearCategoriasPorDefecto(fam);
  const cats = await listCategorias(fam, TipoCategoria.GASTO);
  const conHijas = cats.find((c) => c.subcategorias.length > 0)!;
  catConSub = conHijas.id;
  subId = conHijas.subcategorias[0].id;
  otraCat = cats.find((c) => c.id !== catConSub)!.id;

  // 100 € en la categoría (uno de ellos a través de una subcategoría) y 50 €
  // en otra categoría distinta, todo en abril de 2026.
  await crearGasto(fam, userId, {
    casaId,
    categoriaId: catConSub,
    importe: 60,
    fecha: new Date(2026, 3, 5),
    concepto: "Luz",
    recurrente: false,
  });
  await crearGasto(fam, userId, {
    casaId,
    categoriaId: catConSub,
    subcategoriaId: subId,
    importe: 40,
    fecha: new Date(2026, 3, 20),
    concepto: "Agua",
    recurrente: false,
  });
  await crearGasto(fam, userId, {
    casaId,
    categoriaId: otraCat,
    importe: 50,
    fecha: new Date(2026, 3, 21),
    concepto: "Otra cosa",
    recurrente: false,
  });
  // Un gasto de otro mes del mismo año: solo cuenta para el presupuesto anual.
  await crearGasto(fam, userId, {
    casaId,
    categoriaId: catConSub,
    importe: 25,
    fecha: new Date(2026, 1, 3),
    concepto: "Luz de febrero",
    recurrente: false,
  });
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("presupuestos", () => {
  it("imputa las subcategorías a su categoría raíz", async () => {
    const res = await crearPresupuesto(fam, {
      categoriaId: catConSub,
      importe: 200,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    expect(res.ok).toBe(true);

    const [p] = await listPresupuestos(fam, MES);
    expect(p.gastado).toBe(100); // 60 directos + 40 vía subcategoría
    expect(p.restante).toBe(100);
    expect(p.porcentaje).toBe(50);
    expect(p.estado).toBe("OK");
  });

  it("marca AVISO a partir del 85 % y EXCEDIDO por encima del 100 %", async () => {
    const p = (await listPresupuestos(fam, MES))[0];

    await actualizarPresupuesto(fam, p.id, {
      categoriaId: catConSub,
      importe: 110, // 100/110 = 91 %
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    expect((await listPresupuestos(fam, MES))[0].estado).toBe("AVISO");

    await actualizarPresupuesto(fam, p.id, {
      categoriaId: catConSub,
      importe: 80, // 100/80 = 125 %
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    const excedido = (await listPresupuestos(fam, MES))[0];
    expect(excedido.estado).toBe("EXCEDIDO");
    expect(excedido.restante).toBe(-20);
  });

  it("el presupuesto global suma todas las categorías del mes", async () => {
    const res = await crearPresupuesto(fam, {
      importe: 500,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const global = (await listPresupuestos(fam, MES)).find((p) => p.id === res.id)!;
    expect(global.categoria).toBeNull();
    expect(global.gastado).toBe(150); // 100 + 50, solo abril
  });

  it("el presupuesto anual acumula todo el año natural", async () => {
    const res = await crearPresupuesto(fam, {
      categoriaId: catConSub,
      importe: 1000,
      periodo: "ANUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const anual = (await listPresupuestos(fam, MES)).find((p) => p.id === res.id)!;
    expect(anual.gastado).toBe(125); // abril (100) + febrero (25)
  });

  it("no muestra un presupuesto fuera de su vigencia", async () => {
    const res = await crearPresupuesto(fam, {
      categoriaId: otraCat,
      importe: 300,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-09"),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(
      (await listPresupuestos(fam, MES)).some((p) => p.id === res.id),
    ).toBe(false);
    expect(
      (await listPresupuestos(fam, "2026-10")).some((p) => p.id === res.id),
    ).toBe(true);
  });

  it("rechaza dos presupuestos solapados del mismo ámbito", async () => {
    const res = await crearPresupuesto(fam, {
      categoriaId: catConSub,
      importe: 400,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-06"),
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza una categoría o una casa de otra familia", async () => {
    const cat = await crearPresupuesto(fam, {
      categoriaId: (await listCategorias(otraFam, TipoCategoria.GASTO))[0]?.id,
      importe: 100,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-01"),
    });
    expect(cat.ok).toBe(false);

    const casa = await crearPresupuesto(fam, {
      casaId: otraCasaId,
      importe: 100,
      periodo: "MENSUAL",
      desde: primerDiaDeMes("2026-03"),
    });
    expect(casa.ok).toBe(false);
  });

  it("otra familia no ve nada ni puede borrar", async () => {
    const mios = await listPresupuestos(fam, MES);
    expect(await listPresupuestos(otraFam, MES)).toHaveLength(0);
    expect(await eliminarPresupuesto(otraFam, mios[0].id)).toBe(false);
    expect(
      await prisma.presupuesto.findUnique({ where: { id: mios[0].id } }),
    ).not.toBeNull();
  });

  it("el resumen agrega los mensuales y separa avisos de excedidos", async () => {
    const r = await resumenPresupuestos(fam, MES);
    expect(r.excedidos.length).toBeGreaterThan(0);
    expect(r.limite).toBeGreaterThan(0);
    expect(r.gastado).toBeGreaterThan(0);
  });

  it("propone un importe a partir de la media de los meses previos", async () => {
    // Solo febrero tiene gasto (25 €) en los 3 meses previos a abril.
    const media = await mediaGastoMensual(fam, catConSub, null, MES, 3);
    expect(media).toBeCloseTo(25 / 3, 1);
  });
});
