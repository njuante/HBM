// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearGasto, listGastos, eliminarGasto } from "@/server/db/gastos";
import { crearIngreso, listIngresos } from "@/server/db/ingresos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";

const S = `mov_${Date.now()}`;
let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;
let otraCasaId: string;
let catGastoId: string;
let catIngresoId: string;

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
  catGastoId = (await listCategorias(fam, TipoCategoria.GASTO))[0].id;
  catIngresoId = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("gastos", () => {
  it("crea un gasto y lo suma en el total", async () => {
    const r1 = await crearGasto(fam, userId, {
      casaId,
      categoriaId: catGastoId,
      importe: 10.5,
      fecha: new Date("2026-06-01"),
      concepto: "Compra",
      recurrente: false,
    });
    const r2 = await crearGasto(fam, userId, {
      casaId,
      categoriaId: catGastoId,
      importe: 20.25,
      fecha: new Date("2026-06-05"),
      concepto: "Luz Iberdrola",
      emisor: "Iberdrola",
      recurrente: false,
    });
    expect(r1.ok && r2.ok).toBe(true);

    const { items, total } = await listGastos(fam, {});
    expect(items.length).toBe(2);
    expect(total).toBe(30.75);
  });

  it("filtra por texto en concepto/emisor", async () => {
    const { items } = await listGastos(fam, { texto: "iberdrola" });
    expect(items.length).toBe(1);
    expect(items[0].concepto).toContain("Luz");
  });

  it("rechaza una casa de otra familia (anti cross-tenant)", async () => {
    const res = await crearGasto(fam, userId, {
      casaId: otraCasaId,
      categoriaId: catGastoId,
      importe: 5,
      fecha: new Date(),
      concepto: "Intruso",
      recurrente: false,
    });
    expect(res.ok).toBe(false);
  });

  it("otra familia no ve los gastos", async () => {
    const { items, total } = await listGastos(otraFam, {});
    expect(items.length).toBe(0);
    expect(total).toBe(0);
  });

  it("no elimina un gasto de otra familia", async () => {
    const { items } = await listGastos(fam, {});
    const ok = await eliminarGasto(otraFam, items[0].id);
    expect(ok).toBe(false);
  });
});

describe("ingresos", () => {
  it("crea un ingreso (sin casa) y calcula el total", async () => {
    const r = await crearIngreso(fam, userId, {
      categoriaId: catIngresoId,
      importe: 1500,
      fecha: new Date("2026-06-01"),
      concepto: "Nómina",
      recurrente: true,
    });
    expect(r.ok).toBe(true);

    const { items, total } = await listIngresos(fam, {});
    expect(items.length).toBe(1);
    expect(total).toBe(1500);
    expect(items[0].casa).toBeNull();
  });

  it("rechaza una categoría de tipo GASTO para un ingreso", async () => {
    const res = await crearIngreso(fam, userId, {
      categoriaId: catGastoId, // categoría de gasto
      importe: 100,
      fecha: new Date(),
      concepto: "Erróneo",
      recurrente: false,
    });
    expect(res.ok).toBe(false);
  });
});
