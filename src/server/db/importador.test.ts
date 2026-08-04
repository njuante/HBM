// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  importarMovimientosBatch,
  planificarImportacion,
  type ElementoImportacion,
} from "@/server/db/importador";
import { listGastos } from "@/server/db/gastos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";

const S = `imp_${Date.now()}`;

let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;
let catGasto: string;
let catIngreso: string;

/** Una línea de extracto ya categorizada, lista para importar. */
const linea = (over: Partial<ElementoImportacion> = {}): ElementoImportacion => ({
  fecha: new Date(2026, 6, 10),
  concepto: "COMPRA EN MERCADONA",
  importe: 45.2,
  tipo: "GASTO",
  categoriaId: catGasto,
  casaId,
  ...over,
});

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
  catGasto = (await listCategorias(fam, TipoCategoria.GASTO))[0].id;
  catIngreso = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("importación idempotente", () => {
  it("importa la primera vez y no duplica la segunda", async () => {
    const items = [linea({ concepto: `${S} Mercadona` })];

    const primera = await importarMovimientosBatch(fam, userId, items);
    const segunda = await importarMovimientosBatch(fam, userId, items);

    expect(primera).toMatchObject({ ok: true, importados: 1, duplicados: 0 });
    expect(segunda).toMatchObject({ ok: true, importados: 0, duplicados: 1 });
    expect((await listGastos(fam, { texto: `${S} Mercadona` })).items).toHaveLength(1);
  });

  it("del tramo solapado solo mete lo nuevo", async () => {
    // Lunes a miércoles el primer día; martes a jueves al día siguiente.
    const dia = (d: number, c: string) =>
      linea({ fecha: new Date(2026, 6, d), concepto: `${S} ${c}` });

    const lunes = await importarMovimientosBatch(fam, userId, [
      dia(20, "lunes"),
      dia(21, "martes"),
      dia(22, "miercoles"),
    ]);
    const martes = await importarMovimientosBatch(fam, userId, [
      dia(21, "martes"),
      dia(22, "miercoles"),
      dia(23, "jueves"),
    ]);

    expect(lunes).toMatchObject({ importados: 3 });
    expect(martes).toMatchObject({ importados: 1, duplicados: 2 });
    expect((await listGastos(fam, { texto: `${S} jueves` })).items).toHaveLength(1);
  });

  it("respeta los apuntes repetidos de verdad del mismo día", async () => {
    // Dos cafés idénticos el mismo martes: son dos líneas, no un duplicado.
    const cafe = () => linea({ concepto: `${S} CAFETERIA`, importe: 1.5 });

    const primera = await importarMovimientosBatch(fam, userId, [cafe(), cafe()]);
    expect(primera).toMatchObject({ importados: 2, duplicados: 0 });

    // Al reimportar el mismo día, los dos siguen siendo los mismos dos.
    const segunda = await importarMovimientosBatch(fam, userId, [cafe(), cafe()]);
    expect(segunda).toMatchObject({ importados: 0, duplicados: 2 });

    // Y si al día siguiente el extracto trae un tercero, entra solo ese.
    const tercera = await importarMovimientosBatch(fam, userId, [cafe(), cafe(), cafe()]);
    expect(tercera).toMatchObject({ importados: 1, duplicados: 2 });

    expect((await listGastos(fam, { texto: `${S} CAFETERIA` })).items).toHaveLength(3);
  });

  it("no confunde un cobro con un pago del mismo importe y día", async () => {
    const res = await importarMovimientosBatch(fam, userId, [
      linea({ concepto: `${S} ESPEJO`, importe: 300 }),
      linea({
        concepto: `${S} ESPEJO`,
        importe: 300,
        tipo: "INGRESO",
        categoriaId: catIngreso,
      }),
    ]);
    expect(res).toMatchObject({ importados: 2, duplicados: 0 });
  });

  it("la huella no cruza familias: cada casa importa lo suyo", async () => {
    const otroUser = userId;
    await prisma.casa.create({ data: { familiaId: otraFam, nombre: "Otra" } });
    await crearCategoriasPorDefecto(otraFam);
    const catOtra = (await listCategorias(otraFam, TipoCategoria.GASTO))[0].id;

    const concepto = `${S} COMPARTIDO`;
    const enFam = await importarMovimientosBatch(fam, userId, [linea({ concepto })]);
    const enOtra = await importarMovimientosBatch(otraFam, otroUser, [
      { ...linea({ concepto }), categoriaId: catOtra, casaId: undefined },
    ]);

    expect(enFam).toMatchObject({ importados: 1 });
    expect(enOtra).toMatchObject({ importados: 1, duplicados: 0 });
  });

  it("recategorizar un gasto no lo vuelve importable", async () => {
    const concepto = `${S} RECATEGORIZADO`;
    await importarMovimientosBatch(fam, userId, [linea({ concepto })]);

    const { items } = await listGastos(fam, { texto: concepto });
    const otraCat = (await listCategorias(fam, TipoCategoria.GASTO))[1].id;
    await prisma.gasto.update({
      where: { id: items[0].id },
      data: { categoriaId: otraCat },
    });

    // La huella no mira la categoría, así que sigue siendo el mismo apunte.
    const otraVez = await importarMovimientosBatch(fam, userId, [linea({ concepto })]);
    expect(otraVez).toMatchObject({ importados: 0, duplicados: 1 });
    expect((await listGastos(fam, { texto: concepto })).items).toHaveLength(1);
  });

  it("lo apuntado a mano no estorba: su huella es nula", async () => {
    // Dos gastos a mano idénticos deben poder convivir (NULL nunca choca).
    const data = {
      familiaId: fam,
      usuarioId: userId,
      casaId,
      categoriaId: catGasto,
      importe: "9.99",
      fecha: new Date(2026, 6, 15),
      concepto: `${S} A MANO`,
    };
    await prisma.gasto.create({ data });
    await expect(prisma.gasto.create({ data })).resolves.toBeTruthy();
  });
});

describe("planificarImportacion", () => {
  it("marca lo ya importado y numera los repetidos", async () => {
    const concepto = `${S} PLAN`;
    await importarMovimientosBatch(fam, userId, [linea({ concepto })]);

    const plan = await planificarImportacion(fam, [
      { fecha: new Date(2026, 6, 10), concepto, importe: 45.2, tipo: "GASTO" },
      { fecha: new Date(2026, 6, 10), concepto, importe: 45.2, tipo: "GASTO" },
    ]);

    expect(plan[0]).toMatchObject({ orden: 1, yaImportado: true });
    expect(plan[1]).toMatchObject({ orden: 2, yaImportado: false });
  });

  it("no marca nada cuando la familia está vacía de ese apunte", async () => {
    const plan = await planificarImportacion(fam, [
      { fecha: new Date(2026, 6, 10), concepto: `${S} INEDITO`, importe: 1, tipo: "GASTO" },
    ]);
    expect(plan[0].yaImportado).toBe(false);
  });
});
