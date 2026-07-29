// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  activarAlquileres,
  alquileresActivos,
  crearContrato,
  listContratos,
  cerrarContrato,
  compartirFactura,
} from "@/server/db/alquileres";
import {
  archivoCompartido,
  contratoDelInquilino,
  declararPago,
  facturasCompartidas,
} from "@/server/db/portal";
import { crearInvitacion, aceptarInvitacion } from "@/server/db/invitaciones";
import { crearFactura } from "@/server/db/facturas";
import { Rol } from "@/generated/prisma/enums";

const S = `alq_${Date.now()}`;

let fam: string;
let otraFam: string;
let owner: string;
let inquilino: string;
let casaAlquilada: string;
let casaPropia: string;
let casaOtraFam: string;

let facturaCompartida: string;
let facturaPrivada: string;
let facturaOtraCasa: string;
let facturaOtraFam: string;

const emailInquilino = `inq_${S}@t.com`;

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;

  owner = (
    await prisma.user.create({
      data: { nombre: "Owner", email: `own_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  inquilino = (
    await prisma.user.create({
      data: { nombre: "Inquilino", email: emailInquilino, passwordHash: "x" },
    })
  ).id;
  await prisma.membership.create({
    data: { userId: owner, familiaId: fam, rol: Rol.OWNER },
  });

  casaAlquilada = (
    await prisma.casa.create({ data: { familiaId: fam, nombre: "Piso alquilado" } })
  ).id;
  casaPropia = (
    await prisma.casa.create({ data: { familiaId: fam, nombre: "Nuestra casa" } })
  ).id;
  casaOtraFam = (
    await prisma.casa.create({ data: { familiaId: otraFam, nombre: "Ajena" } })
  ).id;

  const nuevaFactura = async (familiaId: string, casaId: string, emisor: string) => {
    const res = await crearFactura(
      familiaId,
      { casaId, emisor, estadoPago: "PENDIENTE" },
      { path: `facturas/${familiaId}/${emisor}.pdf`, nombre: `${emisor}.pdf`, tipo: "PDF" },
    );
    if (!res.ok) throw new Error(res.error);
    return res.id;
  };

  facturaCompartida = await nuevaFactura(fam, casaAlquilada, "Endesa");
  facturaPrivada = await nuevaFactura(fam, casaAlquilada, "Reforma");
  facturaOtraCasa = await nuevaFactura(fam, casaPropia, "Privada");
  facturaOtraFam = await nuevaFactura(otraFam, casaOtraFam, "Ajena");
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("módulo opcional y contratos", () => {
  it("el módulo nace apagado y se enciende a petición", async () => {
    expect(await alquileresActivos(fam)).toBe(false);
    await activarAlquileres(fam, true);
    expect(await alquileresActivos(fam)).toBe(true);
  });

  it("crear el contrato marca la casa como alquilada", async () => {
    const res = await crearContrato(fam, {
      casaId: casaAlquilada,
      inquilinoNombre: "Inquilino Tester",
      inquilinoEmail: emailInquilino,
      inicio: new Date(2026, 0, 1),
      rentaMensual: 750,
      fianza: 1500,
      diaCobro: 5,
    });
    expect(res.ok).toBe(true);

    const casa = await prisma.casa.findUnique({ where: { id: casaAlquilada } });
    expect(casa?.enAlquiler).toBe(true);

    const [c] = await listContratos(fam);
    expect(c.rentaMensual).toBe(750);
    expect(c.acceso).toBe("SIN_INVITAR");
  });

  it("no admite dos contratos vivos en la misma casa", async () => {
    const res = await crearContrato(fam, {
      casaId: casaAlquilada,
      inquilinoNombre: "Otro",
      inquilinoEmail: `otro_${S}@t.com`,
      inicio: new Date(2026, 6, 1),
      rentaMensual: 800,
      diaCobro: 1,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza una casa de otra familia", async () => {
    const res = await crearContrato(fam, {
      casaId: casaOtraFam,
      inquilinoNombre: "Intruso",
      inquilinoEmail: `intruso_${S}@t.com`,
      inicio: new Date(2026, 0, 1),
      rentaMensual: 100,
      diaCobro: 1,
    });
    expect(res.ok).toBe(false);
  });

  it("otra familia no ve los contratos", async () => {
    expect(await listContratos(otraFam)).toHaveLength(0);
  });
});

describe("acceso del inquilino", () => {
  it("la invitación de inquilino le da acceso a su casa", async () => {
    const inv = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: emailInquilino,
      rol: Rol.INQUILINO,
      casaId: casaAlquilada,
    });
    expect(inv.ok).toBe(true);
    if (!inv.ok) return;

    expect((await listContratos(fam))[0].acceso).toBe("INVITADO");

    const res = await aceptarInvitacion(inv.token, inquilino);
    expect(res.ok).toBe(true);

    // La membresía queda atada a la casa: es su único alcance.
    const m = await prisma.membership.findUnique({
      where: { userId_familiaId: { userId: inquilino, familiaId: fam } },
    });
    expect(m?.rol).toBe(Rol.INQUILINO);
    expect(m?.casaId).toBe(casaAlquilada);

    expect((await listContratos(fam))[0].acceso).toBe("ACTIVO");
  });

  it("solo ve las facturas de su casa que se le han compartido", async () => {
    expect(await facturasCompartidas(fam, casaAlquilada)).toHaveLength(0);

    const res = await compartirFactura(fam, facturaCompartida, true);
    expect(res.ok).toBe(true);

    const suyas = await facturasCompartidas(fam, casaAlquilada);
    expect(suyas).toHaveLength(1);
    expect(suyas[0].id).toBe(facturaCompartida);
  });

  it("no alcanza el archivo de lo que no está compartido", async () => {
    // Compartida: sí.
    expect(
      await archivoCompartido(fam, casaAlquilada, facturaCompartida),
    ).not.toBeNull();

    // Los tres negativos: sin compartir, de otra casa, de otra familia.
    expect(await archivoCompartido(fam, casaAlquilada, facturaPrivada)).toBeNull();
    expect(await archivoCompartido(fam, casaAlquilada, facturaOtraCasa)).toBeNull();
    expect(await archivoCompartido(fam, casaAlquilada, facturaOtraFam)).toBeNull();
    // Y tampoco apuntando a la casa que no es la suya.
    expect(await archivoCompartido(fam, casaPropia, facturaCompartida)).toBeNull();
  });

  it("declarar el pago no cambia el estado de la factura", async () => {
    expect(await declararPago(fam, casaAlquilada, facturaCompartida)).toBe(true);

    const f = await prisma.factura.findUnique({ where: { id: facturaCompartida } });
    expect(f?.pagoDeclaradoAt).not.toBeNull();
    expect(f?.estadoPago).toBe("PENDIENTE");

    // Sobre una que no es suya, no hace nada.
    expect(await declararPago(fam, casaAlquilada, facturaPrivada)).toBe(false);
  });

  it("no se comparte una factura sin casa ni de una casa no alquilada", async () => {
    const sinCasa = await crearFactura(
      fam,
      { estadoPago: "PENDIENTE" },
      { path: `facturas/${fam}/suelta.pdf`, nombre: "suelta.pdf", tipo: "PDF" },
    );
    if (!sinCasa.ok) return;

    expect((await compartirFactura(fam, sinCasa.id, true)).ok).toBe(false);
    expect((await compartirFactura(fam, facturaOtraCasa, true)).ok).toBe(false);
  });

  it("solo ve el contrato de su casa", async () => {
    expect(await contratoDelInquilino(fam, casaAlquilada)).not.toBeNull();
    expect(await contratoDelInquilino(fam, casaPropia)).toBeNull();
    expect(await contratoDelInquilino(otraFam, casaAlquilada)).toBeNull();
  });

  it("cerrar el contrato le quita el acceso de inmediato", async () => {
    const [c] = await listContratos(fam);
    expect(await cerrarContrato(fam, c.id)).toBe(true);

    const m = await prisma.membership.findUnique({
      where: { userId_familiaId: { userId: inquilino, familiaId: fam } },
    });
    expect(m).toBeNull();

    const casa = await prisma.casa.findUnique({ where: { id: casaAlquilada } });
    expect(casa?.enAlquiler).toBe(false);
  });
});
