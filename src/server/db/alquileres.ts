import "server-only";
import { prisma } from "@/lib/prisma";
import { Rol } from "@/generated/prisma/enums";
import { decimalToNumber } from "@/lib/money";
import type {
  ContratoDTO,
  ContratoInput,
  EstadoAcceso,
} from "@/lib/validation/alquiler";

type Result = { ok: true; id: string } | { ok: false; error: string };

/** ¿La familia tiene el módulo encendido? Todo lo demás depende de esto. */
export async function alquileresActivos(familiaId: string): Promise<boolean> {
  const f = await prisma.familia.findUnique({
    where: { id: familiaId },
    select: { alquileresActivo: true },
  });
  return f?.alquileresActivo ?? false;
}

export async function activarAlquileres(
  familiaId: string,
  activo: boolean,
): Promise<void> {
  await prisma.familia.update({
    where: { id: familiaId },
    data: { alquileresActivo: activo },
  });
}

export async function marcarCasaEnAlquiler(
  familiaId: string,
  casaId: string,
  enAlquiler: boolean,
): Promise<boolean> {
  const res = await prisma.casa.updateMany({
    where: { id: casaId, familiaId },
    data: { enAlquiler },
  });
  return res.count > 0;
}

export async function listContratos(familiaId: string): Promise<ContratoDTO[]> {
  const filas = await prisma.contratoAlquiler.findMany({
    where: { familiaId },
    orderBy: [{ activo: "desc" }, { inicio: "desc" }],
    include: {
      casa: { select: { id: true, nombre: true, direccion: true } },
    },
  });

  // El estado del acceso se deduce de dos sitios: si ya hay membresía de
  // inquilino para esa casa, o si queda una invitación viva para ese email.
  const [accesos, invitaciones, compartidas] = await Promise.all([
    prisma.membership.findMany({
      where: { familiaId, rol: Rol.INQUILINO },
      select: { casaId: true, user: { select: { id: true, email: true } } },
    }),
    prisma.invitacion.findMany({
      where: { familiaId, rol: Rol.INQUILINO, aceptadaAt: null },
      select: { id: true, email: true, casaId: true, expiresAt: true },
    }),
    prisma.factura.groupBy({
      by: ["casaId"],
      where: { familiaId, compartidaAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const ahora = new Date();

  return filas.map((c) => {
    const activo = accesos.find(
      (a) =>
        a.casaId === c.casaId &&
        a.user.email.toLowerCase() === c.inquilinoEmail.toLowerCase(),
    );
    const pendiente = invitaciones.find(
      (i) =>
        i.casaId === c.casaId &&
        i.email.toLowerCase() === c.inquilinoEmail.toLowerCase() &&
        i.expiresAt > ahora,
    );

    const acceso: EstadoAcceso = activo
      ? "ACTIVO"
      : pendiente
        ? "INVITADO"
        : "SIN_INVITAR";

    return {
      id: c.id,
      casa: c.casa,
      inquilinoNombre: c.inquilinoNombre,
      inquilinoEmail: c.inquilinoEmail,
      inicio: c.inicio.toISOString(),
      fin: c.fin ? c.fin.toISOString() : null,
      rentaMensual: decimalToNumber(c.rentaMensual),
      fianza: c.fianza ? decimalToNumber(c.fianza) : null,
      diaCobro: c.diaCobro,
      activo: c.activo,
      notas: c.notas,
      acceso,
      invitacionId: pendiente?.id ?? null,
      tieneRecurrencia: Boolean(c.recurrenciaId),
      facturasCompartidas:
        compartidas.find((f) => f.casaId === c.casaId)?._count._all ?? 0,
    };
  });
}

export async function getContrato(familiaId: string, id: string) {
  return prisma.contratoAlquiler.findFirst({ where: { id, familiaId } });
}

async function validarCasa(
  familiaId: string,
  casaId: string,
): Promise<string | null> {
  const casa = await prisma.casa.findFirst({ where: { id: casaId, familiaId } });
  if (!casa) return "La casa seleccionada no es válida.";
  return null;
}

export async function crearContrato(
  familiaId: string,
  data: ContratoInput,
): Promise<Result> {
  const err = await validarCasa(familiaId, data.casaId);
  if (err) return { ok: false, error: err };

  if (data.fin && data.fin < data.inicio) {
    return { ok: false, error: "La fecha de fin no puede ser anterior al inicio." };
  }

  // Una casa no puede tener dos contratos vivos a la vez.
  const vivo = await prisma.contratoAlquiler.findFirst({
    where: { familiaId, casaId: data.casaId, activo: true },
  });
  if (vivo) {
    return {
      ok: false,
      error: "Esa casa ya tiene un contrato activo. Ciérralo antes de crear otro.",
    };
  }

  const c = await prisma.$transaction(async (tx) => {
    const creado = await tx.contratoAlquiler.create({
      data: {
        familiaId,
        casaId: data.casaId,
        inquilinoNombre: data.inquilinoNombre,
        inquilinoEmail: data.inquilinoEmail,
        inicio: data.inicio,
        fin: data.fin ?? null,
        rentaMensual: data.rentaMensual.toFixed(2),
        fianza: data.fianza ? data.fianza.toFixed(2) : null,
        diaCobro: data.diaCobro,
        notas: data.notas ?? null,
      },
    });
    // Alquilar una casa implica marcarla como alquilada.
    await tx.casa.update({
      where: { id: data.casaId },
      data: { enAlquiler: true },
    });
    return creado;
  });

  return { ok: true, id: c.id };
}

export async function actualizarContrato(
  familiaId: string,
  id: string,
  data: ContratoInput,
): Promise<Result> {
  const existe = await prisma.contratoAlquiler.findFirst({
    where: { id, familiaId },
  });
  if (!existe) return { ok: false, error: "Contrato no encontrado." };

  const err = await validarCasa(familiaId, data.casaId);
  if (err) return { ok: false, error: err };

  if (data.fin && data.fin < data.inicio) {
    return { ok: false, error: "La fecha de fin no puede ser anterior al inicio." };
  }

  await prisma.contratoAlquiler.updateMany({
    where: { id, familiaId },
    data: {
      casaId: data.casaId,
      inquilinoNombre: data.inquilinoNombre,
      inquilinoEmail: data.inquilinoEmail,
      inicio: data.inicio,
      fin: data.fin ?? null,
      rentaMensual: data.rentaMensual.toFixed(2),
      fianza: data.fianza ? data.fianza.toFixed(2) : null,
      diaCobro: data.diaCobro,
      notas: data.notas ?? null,
    },
  });
  return { ok: true, id };
}

/**
 * Cierra el contrato y **retira el acceso al portal**: dejar entrando a quien
 * ya no vive ahí sería el fallo más obvio del módulo.
 */
export async function cerrarContrato(
  familiaId: string,
  id: string,
): Promise<boolean> {
  const c = await prisma.contratoAlquiler.findFirst({ where: { id, familiaId } });
  if (!c) return false;

  await prisma.$transaction(async (tx) => {
    await tx.contratoAlquiler.update({
      where: { id },
      data: { activo: false, fin: c.fin ?? new Date() },
    });
    const usuario = await tx.user.findUnique({
      where: { email: c.inquilinoEmail },
      select: { id: true },
    });
    if (usuario) {
      await tx.membership.deleteMany({
        where: {
          familiaId,
          userId: usuario.id,
          rol: Rol.INQUILINO,
          casaId: c.casaId,
        },
      });
    }
    await tx.invitacion.deleteMany({
      where: { familiaId, email: c.inquilinoEmail, rol: Rol.INQUILINO },
    });
    await tx.casa.update({ where: { id: c.casaId }, data: { enAlquiler: false } });
  });

  return true;
}

export async function eliminarContrato(
  familiaId: string,
  id: string,
): Promise<boolean> {
  await cerrarContrato(familiaId, id);
  const res = await prisma.contratoAlquiler.deleteMany({ where: { id, familiaId } });
  return res.count > 0;
}

/** Enlaza el contrato con la recurrencia de ingreso que genera su renta. */
export async function enlazarRecurrencia(
  familiaId: string,
  contratoId: string,
  recurrenciaId: string,
): Promise<boolean> {
  const res = await prisma.contratoAlquiler.updateMany({
    where: { id: contratoId, familiaId },
    data: { recurrenciaId },
  });
  return res.count > 0;
}

/* ── Compartir facturas con el inquilino ───────────────────────────────── */

/**
 * Marca o desmarca una factura como visible para el inquilino de su casa.
 * Solo tiene sentido en facturas con casa, y esa casa debe estar en alquiler.
 */
export async function compartirFactura(
  familiaId: string,
  facturaId: string,
  compartir: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const f = await prisma.factura.findFirst({
    where: { id: facturaId, familiaId },
    include: { casa: { select: { id: true, enAlquiler: true } } },
  });
  if (!f) return { ok: false, error: "Factura no encontrada." };
  if (!f.casa) {
    return { ok: false, error: "Asigna la factura a una casa antes de compartirla." };
  }
  if (compartir && !f.casa.enAlquiler) {
    return { ok: false, error: "Esa casa no está marcada como alquilada." };
  }

  await prisma.factura.update({
    where: { id: facturaId },
    data: {
      compartidaAt: compartir ? new Date() : null,
      // Al dejar de compartirla se olvida también lo que el inquilino declaró.
      pagoDeclaradoAt: compartir ? f.pagoDeclaradoAt : null,
    },
  });
  return { ok: true };
}
