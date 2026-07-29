// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  listGastos,
} from "@/server/db/gastos";
import { crearIngreso, eliminarIngreso, listIngresos } from "@/server/db/ingresos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";

// Un MEMBER puede apuntar movimientos, pero solo edita o borra los suyos.
// La capa de datos lo aplica con el parámetro `autorId` (ver `autorRequerido`).

const S = `perm_${Date.now()}`;
let fam: string;
let owner: string;
let member: string;
let casaId: string;
let catGasto: string;
let catIngreso: string;

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  owner = (
    await prisma.user.create({
      data: { nombre: "Owner", email: `own_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  member = (
    await prisma.user.create({
      data: { nombre: "Member", email: `mem_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  casaId = (await prisma.casa.create({ data: { familiaId: fam, nombre: "Casa" } })).id;
  await crearCategoriasPorDefecto(fam);
  catGasto = (await listCategorias(fam, TipoCategoria.GASTO))[0].id;
  catIngreso = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;
});

afterAll(async () => {
  await prisma.familia.delete({ where: { id: fam } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

async function gastoDelOwner(concepto: string): Promise<string> {
  const res = await crearGasto(fam, owner, {
    casaId,
    categoriaId: catGasto,
    importe: 30,
    fecha: new Date("2026-05-10"),
    concepto,
    recurrente: false,
  });
  if (!res.ok) throw new Error(res.error);
  return res.id;
}

describe("movimientos: solo el autor (o un gestor) edita", () => {
  it("un MEMBER no borra el gasto de otro", async () => {
    const id = await gastoDelOwner("Gasto del owner");

    expect(await eliminarGasto(fam, id, member)).toBe(false);
    expect(await prisma.gasto.findUnique({ where: { id } })).not.toBeNull();
  });

  it("un MEMBER no edita el gasto de otro", async () => {
    const id = await gastoDelOwner("Intocable");

    const res = await actualizarGasto(
      fam,
      id,
      {
        casaId,
        categoriaId: catGasto,
        importe: 999,
        fecha: new Date("2026-05-10"),
        concepto: "Editado por un intruso",
        recurrente: false,
      },
      member,
    );

    expect(res.ok).toBe(false);
    const g = await prisma.gasto.findUnique({ where: { id } });
    expect(g?.concepto).toBe("Intocable");
  });

  it("un MEMBER sí borra el suyo", async () => {
    const res = await crearGasto(fam, member, {
      casaId,
      categoriaId: catGasto,
      importe: 12,
      fecha: new Date("2026-05-11"),
      concepto: "Mi gasto",
      recurrente: false,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(await eliminarGasto(fam, res.id, member)).toBe(true);
  });

  it("sin autorId (OWNER/ADMIN) se borra cualquiera", async () => {
    const id = await gastoDelOwner("Borrable por el gestor");
    expect(await eliminarGasto(fam, id)).toBe(true);
  });

  it("la misma regla rige en ingresos", async () => {
    const res = await crearIngreso(fam, owner, {
      categoriaId: catIngreso,
      importe: 100,
      fecha: new Date("2026-05-12"),
      concepto: "Ingreso del owner",
      recurrente: false,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(await eliminarIngreso(fam, res.id, member)).toBe(false);
    expect(await eliminarIngreso(fam, res.id, owner)).toBe(true);
  });

  it("listar sigue mostrando los movimientos de toda la familia", async () => {
    const { items } = await listGastos(fam, {});
    expect(items.some((g) => g.usuarioId === owner)).toBe(true);
    const { items: ingresos } = await listIngresos(fam, {});
    expect(ingresos.every((i) => typeof i.usuarioId === "string")).toBe(true);
  });
});
