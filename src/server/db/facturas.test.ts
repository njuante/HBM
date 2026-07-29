// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearFactura,
  listFacturas,
  cambiarEstadoPago,
  eliminarFactura,
  getFacturaArchivo,
  gastosSinFactura,
} from "@/server/db/facturas";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { listCategorias } from "@/server/db/categorias";
import { TipoCategoria } from "@/generated/prisma/enums";
import type { FacturaMetaInput } from "@/lib/validation/factura";

const S = `fac_${Date.now()}`;
let fam: string;
let otraFam: string;
let gastoId: string;

const archivo = { path: `facturas/x/${S}.pdf`, nombre: `${S}.pdf`, tipo: "PDF" as const };
const metaBase: FacturaMetaInput = { estadoPago: "PENDIENTE" };

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;
  const user = await prisma.user.create({
    data: { nombre: "U", email: `u_${S}@t.com`, passwordHash: "x" },
  });
  const casa = await prisma.casa.create({ data: { familiaId: fam, nombre: "Casa" } });
  await crearCategoriasPorDefecto(fam);
  const cat = (await listCategorias(fam, TipoCategoria.GASTO))[0];
  gastoId = (
    await prisma.gasto.create({
      data: {
        familiaId: fam,
        casaId: casa.id,
        categoriaId: cat.id,
        usuarioId: user.id,
        importe: "50.00",
        fecha: new Date(),
        concepto: "Luz",
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("facturas", () => {
  it("crea una factura y la lista", async () => {
    const r = await crearFactura(fam, { ...metaBase, emisor: "Iberdrola" }, archivo);
    expect(r.ok).toBe(true);
    const list = await listFacturas(fam, {});
    expect(list.some((f) => f.emisor === "Iberdrola")).toBe(true);
  });

  it("vincula una factura a un gasto y rechaza vincular otra al mismo gasto", async () => {
    const r1 = await crearFactura(fam, { ...metaBase, gastoId }, {
      ...archivo,
      path: `${archivo.path}.1`,
    });
    expect(r1.ok).toBe(true);

    // el gasto ya no aparece como disponible
    const disp = await gastosSinFactura(fam);
    expect(disp.some((g) => g.id === gastoId)).toBe(false);

    const r2 = await crearFactura(fam, { ...metaBase, gastoId }, {
      ...archivo,
      path: `${archivo.path}.2`,
    });
    expect(r2.ok).toBe(false);
  });

  it("rechaza vincular un gasto de otra familia", async () => {
    const r = await crearFactura(otraFam, { ...metaBase, gastoId }, {
      ...archivo,
      path: `${archivo.path}.3`,
    });
    expect(r.ok).toBe(false);
  });

  it("cambia el estado de pago", async () => {
    const list = await listFacturas(fam, {});
    const ok = await cambiarEstadoPago(fam, list[0].id, "PAGADA");
    expect(ok).toBe(true);
    const filtered = await listFacturas(fam, { estadoPago: "PAGADA" });
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("otra familia no ve ni accede a las facturas", async () => {
    const list = await listFacturas(otraFam, {});
    expect(list.length).toBe(0);
    const first = (await listFacturas(fam, {}))[0];
    expect(await getFacturaArchivo(otraFam, first.id)).toBeNull();
  });

  it("elimina una factura y devuelve la ruta del archivo", async () => {
    const first = (await listFacturas(fam, {}))[0];
    const path = await eliminarFactura(fam, first.id);
    expect(path).toBeTruthy();
    expect(await getFacturaArchivo(fam, first.id)).toBeNull();
  });
});
