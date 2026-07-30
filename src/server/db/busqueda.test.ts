// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { buscarGlobal } from "@/server/db/busqueda";
import { crearGasto } from "@/server/db/gastos";
import { crearIngreso } from "@/server/db/ingresos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";

const S = `bus_${Date.now()}`;
let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;

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

  const catG = (await listCategorias(fam, TipoCategoria.GASTO))[0].id;
  const catI = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;

  await crearGasto(fam, userId, {
    casaId,
    categoriaId: catG,
    importe: 45,
    fecha: new Date(2026, 4, 3),
    concepto: "Compra en Mercadona",
    emisor: "Mercadona",
    recurrente: false,
  });
  await crearIngreso(fam, userId, {
    categoriaId: catI,
    importe: 1800,
    fecha: new Date(2026, 4, 1),
    concepto: "Nómina de mayo",
    recurrente: false,
  });
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("búsqueda de la paleta", () => {
  it("encuentra sin tildes lo que se guardó con ellas", async () => {
    // Nadie teclea «Nómina» con tilde en un buscador.
    const r = await buscarGlobal(fam, "nomina");
    expect(r).toHaveLength(1);
    expect(r[0].titulo).toBe("Nómina de mayo");
    expect(r[0].tipo).toBe("INGRESO");
  });

  it("busca también en el emisor y da igual la caja", async () => {
    const r = await buscarGlobal(fam, "MERCADONA");
    expect(r.some((x) => x.titulo === "Compra en Mercadona")).toBe(true);
  });

  it("los gastos salen en negativo y los ingresos en positivo", async () => {
    const gasto = (await buscarGlobal(fam, "mercadona"))[0];
    const ingreso = (await buscarGlobal(fam, "nomina"))[0];
    expect(gasto.importe).toBe(-45);
    expect(ingreso.importe).toBe(1800);
  });

  it("no busca con menos de dos letras", async () => {
    expect(await buscarGlobal(fam, "n")).toEqual([]);
    expect(await buscarGlobal(fam, "  ")).toEqual([]);
  });

  it("otra familia no encuentra nada", async () => {
    expect(await buscarGlobal(otraFam, "nomina")).toEqual([]);
    expect(await buscarGlobal(otraFam, "mercadona")).toEqual([]);
  });
});
