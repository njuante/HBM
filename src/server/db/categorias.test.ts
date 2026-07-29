// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listCategorias,
  crearCategoria,
  eliminarCategoria,
} from "@/server/db/categorias";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { TipoCategoria } from "@/generated/prisma/enums";

const S = `cat_${Date.now()}`;
let fam: string;
let otraFam: string;

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;
  await crearCategoriasPorDefecto(fam);
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
});

describe("categorías por defecto", () => {
  it("crea categorías raíz de gasto e ingreso con subcategorías", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const ingresos = await listCategorias(fam, TipoCategoria.INGRESO);
    expect(gastos.length).toBeGreaterThan(0);
    expect(ingresos.length).toBeGreaterThan(0);

    const suministros = gastos.find((c) => c.nombre === "Suministros");
    expect(suministros).toBeDefined();
    expect(suministros!.subcategorias.map((s) => s.nombre)).toContain("Luz");
  });
});

describe("crear categorías", () => {
  it("permite crear una subcategoría de una raíz del mismo tipo", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const parent = gastos[0];
    const res = await crearCategoria(fam, {
      nombre: `Sub_${S}`,
      tipo: "GASTO",
      color: "#123456",
      parentId: parent.id,
    });
    expect(res.ok).toBe(true);
  });

  it("no permite más de un nivel de subcategorías", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const parent = gastos.find((c) => c.subcategorias.length > 0)!;
    const sub = parent.subcategorias[0];
    const res = await crearCategoria(fam, {
      nombre: `SubSub_${S}`,
      tipo: "GASTO",
      color: "#123456",
      parentId: sub.id,
    });
    expect(res.ok).toBe(false);
  });

  it("no permite categorías duplicadas (mismo nombre/tipo/nivel)", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const nombre = gastos[0].nombre;
    const res = await crearCategoria(fam, {
      nombre,
      tipo: "GASTO",
      color: "#123456",
    });
    expect(res.ok).toBe(false);
  });
});

describe("eliminar categorías", () => {
  it("bloquea el borrado si tiene movimientos asociados", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const cat = gastos.find((c) => c.subcategorias.length === 0)!;
    const casa = await prisma.casa.create({
      data: { familiaId: fam, nombre: "Casa" },
    });
    const user = await prisma.user.create({
      data: { nombre: "U", email: `u_${S}@t.com`, passwordHash: "x" },
    });
    await prisma.gasto.create({
      data: {
        familiaId: fam,
        casaId: casa.id,
        categoriaId: cat.id,
        usuarioId: user.id,
        importe: "10.00",
        fecha: new Date(),
        concepto: "Test",
      },
    });

    const res = await eliminarCategoria(fam, cat.id);
    expect(res.ok).toBe(false);
  });

  it("no elimina categorías de otra familia", async () => {
    const gastos = await listCategorias(fam, TipoCategoria.GASTO);
    const res = await eliminarCategoria(otraFam, gastos[0].id);
    expect(res.ok).toBe(false);
  });
});
