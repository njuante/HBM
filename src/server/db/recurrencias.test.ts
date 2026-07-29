// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearRecurrencia,
  actualizarRecurrencia,
  eliminarRecurrencia,
  materializarRecurrencias,
  listRecurrencias,
  listPropuestas,
  confirmarPropuesta,
  descartarPropuesta,
  proximosCargos,
} from "@/server/db/recurrencias";
import { listGastos } from "@/server/db/gastos";
import { listIngresos } from "@/server/db/ingresos";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";
import type { RecurrenciaInput } from "@/lib/validation/recurrencia";

const S = `rec_${Date.now()}`;

let fam: string;
let otraFam: string;
let userId: string;
let casaId: string;
let otraCasaId: string;
let catGasto: string;
let catIngreso: string;

/** Plantilla mensual base; cada test ajusta lo que necesita. */
const base = (over: Partial<RecurrenciaInput> = {}): RecurrenciaInput => ({
  tipo: "GASTO",
  casaId,
  categoriaId: catGasto,
  importe: 100,
  concepto: "Alquiler",
  frecuencia: "MENSUAL",
  intervalo: 1,
  proximaFecha: new Date(2026, 0, 1),
  automatica: true,
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
  otraCasaId = (
    await prisma.casa.create({ data: { familiaId: otraFam, nombre: "Otra" } })
  ).id;
  await crearCategoriasPorDefecto(fam);
  catGasto = (await listCategorias(fam, TipoCategoria.GASTO))[0].id;
  catIngreso = (await listCategorias(fam, TipoCategoria.INGRESO))[0].id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("materialización", () => {
  it("genera una ocurrencia por periodo atrasado y adelanta el reloj", async () => {
    const r = await crearRecurrencia(fam, userId, base({ concepto: "Alquiler 3m" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Tres meses de atraso: 1 de enero, febrero y marzo.
    const res = await materializarRecurrencias(fam, new Date(2026, 2, 15));
    expect(res.creados).toBe(3);

    const { items } = await listGastos(fam, { texto: "Alquiler 3m" });
    expect(items).toHaveLength(3);

    const despues = await prisma.recurrencia.findUnique({ where: { id: r.id } });
    expect(despues?.proximaFecha.getMonth()).toBe(3); // abril

    await eliminarRecurrencia(fam, r.id);
  });

  it("es idempotente: repetirla no duplica nada", async () => {
    const r = await crearRecurrencia(fam, userId, base({ concepto: "Idempotente" }));
    if (!r.ok) return;

    const primera = await materializarRecurrencias(fam, new Date(2026, 1, 15));
    const segunda = await materializarRecurrencias(fam, new Date(2026, 1, 15));

    expect(primera.creados).toBe(2);
    expect(segunda.creados).toBe(0);
    expect((await listGastos(fam, { texto: "Idempotente" })).items).toHaveLength(2);

    await eliminarRecurrencia(fam, r.id);
  });

  it("no genera nada si la próxima fecha aún no ha llegado", async () => {
    const r = await crearRecurrencia(
      fam,
      userId,
      base({ concepto: "Futuro", proximaFecha: new Date(2030, 0, 1) }),
    );
    if (!r.ok) return;

    const res = await materializarRecurrencias(fam, new Date(2026, 5, 1));
    expect(res.creados).toBe(0);
    await eliminarRecurrencia(fam, r.id);
  });

  it("una recurrencia manual propone en vez de crear", async () => {
    const r = await crearRecurrencia(
      fam,
      userId,
      base({ concepto: "Manual", automatica: false, importe: 55 }),
    );
    if (!r.ok) return;

    const res = await materializarRecurrencias(fam, new Date(2026, 1, 15));
    expect(res.creados).toBe(0);
    expect(res.propuestos).toBe(2);
    expect((await listGastos(fam, { texto: "Manual" })).items).toHaveLength(0);

    const propuestas = await listPropuestas(fam);
    expect(propuestas).toHaveLength(2);

    // Confirmar una la convierte en gasto real; descartar la otra la silencia.
    expect(await confirmarPropuesta(fam, propuestas[0].id)).toBe(true);
    expect(await descartarPropuesta(fam, propuestas[1].id)).toBe(true);

    expect((await listGastos(fam, { texto: "Manual" })).items).toHaveLength(1);
    expect(await listPropuestas(fam)).toHaveLength(0);

    // Y volver a materializar no resucita la descartada.
    await materializarRecurrencias(fam, new Date(2026, 1, 15));
    expect(await listPropuestas(fam)).toHaveLength(0);

    await eliminarRecurrencia(fam, r.id);
  });

  it("se detiene y se desactiva al llegar a la fecha de fin", async () => {
    const r = await crearRecurrencia(
      fam,
      userId,
      base({
        concepto: "Con fin",
        fin: new Date(2026, 1, 1),
      }),
    );
    if (!r.ok) return;

    const res = await materializarRecurrencias(fam, new Date(2026, 6, 1));
    expect(res.creados).toBe(2); // enero y febrero

    const despues = await prisma.recurrencia.findUnique({ where: { id: r.id } });
    expect(despues?.activa).toBe(false);

    await eliminarRecurrencia(fam, r.id);
  });

  it("genera ingresos igual que gastos, sin casa obligatoria", async () => {
    const r = await crearRecurrencia(
      fam,
      userId,
      base({
        tipo: "INGRESO",
        casaId: undefined,
        categoriaId: catIngreso,
        concepto: "Nómina rec",
        importe: 1500,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    await materializarRecurrencias(fam, new Date(2026, 1, 15));
    const { items } = await listIngresos(fam, { texto: "Nómina rec" });
    expect(items).toHaveLength(2);
    expect(items[0].recurrente).toBe(true);

    await eliminarRecurrencia(fam, r.id);
  });

  it("al borrar la plantilla los movimientos generados se quedan", async () => {
    const r = await crearRecurrencia(fam, userId, base({ concepto: "Histórico" }));
    if (!r.ok) return;
    await materializarRecurrencias(fam, new Date(2026, 0, 15));

    expect(await eliminarRecurrencia(fam, r.id)).toBe(true);
    expect((await listGastos(fam, { texto: "Histórico" })).items).toHaveLength(1);
  });
});

describe("validación y aislamiento", () => {
  it("un gasto recurrente exige casa", async () => {
    const res = await crearRecurrencia(
      fam,
      userId,
      base({ casaId: undefined, concepto: "Sin casa" }),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza una categoría del tipo contrario", async () => {
    const res = await crearRecurrencia(
      fam,
      userId,
      base({ categoriaId: catIngreso, concepto: "Tipo cruzado" }),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza una casa de otra familia", async () => {
    const res = await crearRecurrencia(
      fam,
      userId,
      base({ casaId: otraCasaId, concepto: "Casa ajena" }),
    );
    expect(res.ok).toBe(false);
  });

  it("otra familia no la ve, ni la edita, ni la borra", async () => {
    const r = await crearRecurrencia(fam, userId, base({ concepto: "Privada" }));
    if (!r.ok) return;

    expect(await listRecurrencias(otraFam)).toHaveLength(0);
    expect(await eliminarRecurrencia(otraFam, r.id)).toBe(false);

    const edit = await actualizarRecurrencia(otraFam, r.id, base({ importe: 1 }));
    expect(edit.ok).toBe(false);
    expect(await prisma.recurrencia.findUnique({ where: { id: r.id } })).not.toBeNull();

    await eliminarRecurrencia(fam, r.id);
  });

  it("materializar una familia no toca las plantillas de otra", async () => {
    const r = await crearRecurrencia(fam, userId, base({ concepto: "Aislada" }));
    if (!r.ok) return;

    const res = await materializarRecurrencias(otraFam, new Date(2026, 6, 1));
    expect(res.creados).toBe(0);
    expect((await listGastos(fam, { texto: "Aislada" })).items).toHaveLength(0);

    await eliminarRecurrencia(fam, r.id);
  });
});

describe("próximos cargos", () => {
  it("lista lo que va a caer en la ventana pedida", async () => {
    const dentroDe10 = new Date();
    dentroDe10.setDate(dentroDe10.getDate() + 10);

    const r = await crearRecurrencia(
      fam,
      userId,
      base({ concepto: "Próximo", proximaFecha: dentroDe10 }),
    );
    if (!r.ok) return;

    const cargos = await proximosCargos(fam, 30);
    expect(cargos.some((c) => c.concepto === "Próximo")).toBe(true);

    const cercanos = await proximosCargos(fam, 5);
    expect(cercanos.some((c) => c.concepto === "Próximo")).toBe(false);

    await eliminarRecurrencia(fam, r.id);
  });
});
