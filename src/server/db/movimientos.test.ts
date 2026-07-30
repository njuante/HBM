// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearGasto, crearGastoProrrateado, listGastos, eliminarGasto } from "@/server/db/gastos";
import { crearIngreso, listIngresos } from "@/server/db/ingresos";
import { listMovimientos } from "@/server/db/movimientos";
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

describe("visor unificado", () => {
  it("mezcla gastos e ingresos ordenados por fecha y calcula el saldo", async () => {
    const { items, resumen } = await listMovimientos(fam, {});

    expect(items.length).toBe(3); // 2 gastos + 1 ingreso
    // El más reciente primero; los dos del día 1 empatan y da igual su orden.
    expect(items[0].concepto).toBe("Luz Iberdrola");
    expect(items.filter((m) => m.tipo === "INGRESO")).toHaveLength(1);
    const fechas = items.map((m) => m.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
    expect(resumen.gastos).toBe(30.75);
    expect(resumen.ingresos).toBe(1500);
    expect(resumen.saldo).toBe(1469.25);
    expect(resumen.cuantos).toBe(3);
  });

  it("filtra por tipo sin tocar el resto de filtros", async () => {
    const soloGastos = await listMovimientos(fam, { tipo: "GASTO" });
    expect(soloGastos.items.every((m) => m.tipo === "GASTO")).toBe(true);
    expect(soloGastos.resumen.ingresos).toBe(0);

    const soloIngresos = await listMovimientos(fam, { tipo: "INGRESO" });
    expect(soloIngresos.items).toHaveLength(1);
    expect(soloIngresos.resumen.gastos).toBe(0);
  });

  it("busca en el concepto y en el origen de los dos tipos", async () => {
    const porEmisor = await listMovimientos(fam, { texto: "iberdrola" });
    expect(porEmisor.items).toHaveLength(1);
    expect(porEmisor.items[0].origen).toBe("Iberdrola");

    const porConcepto = await listMovimientos(fam, { texto: "nómina" });
    expect(porConcepto.items).toHaveLength(1);
    expect(porConcepto.items[0].tipo).toBe("INGRESO");
  });

  it("trae el nombre de la categoría y de la casa", async () => {
    const { items } = await listMovimientos(fam, { tipo: "GASTO" });
    expect(items[0].categoria.nombre).toBeTruthy();
    expect(items[0].casa?.nombre).toBe("Casa");
  });

  it("pagina sin repetir ni perder filas", async () => {
    const p1 = await listMovimientos(fam, {}, { porPagina: 2, pagina: 1 });
    const p2 = await listMovimientos(fam, {}, { porPagina: 2, pagina: 2 });

    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    expect(p1.paginas).toBe(2);
    // Los totales son del filtro entero, no de la página.
    expect(p1.resumen.cuantos).toBe(3);

    const ids = [...p1.items, ...p2.items].map((m) => m.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("marca lo que un MEMBER no puede editar", async () => {
    const { items } = await listMovimientos(fam, {}, { autorId: "otro-usuario" });
    expect(items.every((m) => m.puedeEditar === false)).toBe(true);

    const propios = await listMovimientos(fam, {}, { autorId: userId });
    expect(propios.items.every((m) => m.puedeEditar)).toBe(true);
  });

  it("otra familia no ve nada", async () => {
    const { items, resumen } = await listMovimientos(otraFam, {});
    expect(items).toHaveLength(0);
    expect(resumen.saldo).toBe(0);
  });

  it("crearGastoProrrateado divide una factura trimestral en 3 cuotas mensuales", async () => {
    const res = await crearGastoProrrateado(
      fam,
      userId,
      {
        casaId,
        categoriaId: catGastoId,
        importe: 150.0,
        fecha: new Date(2026, 4, 15),
        concepto: "Factura Agua",
        recurrente: false,
      },
      3,
    );

    expect(res.ok).toBe(true);

    const gastos = await prisma.gasto.findMany({
      where: { familiaId: fam, concepto: { contains: "Factura Agua" } },
      orderBy: { fecha: "asc" },
    });

    expect(gastos).toHaveLength(3);
    expect(Number(gastos[0].importe)).toBe(50.0);
    expect(Number(gastos[1].importe)).toBe(50.0);
    expect(Number(gastos[2].importe)).toBe(50.0);
    expect(gastos[0].concepto).toContain("(Trimestral 1/3)");
    expect(gastos[1].concepto).toContain("(Trimestral 2/3)");
    expect(gastos[2].concepto).toContain("(Trimestral 3/3)");
  });
});
