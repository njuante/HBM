import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getFacturaArchivo } from "@/server/db/facturas";
import { archivoCompartido } from "@/server/db/portal";
import { fileStorage } from "@/server/storage";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

function mimeDe(nombre: string): string {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Descarga del archivo de una factura.
 *
 * El matcher del proxy excluye `/api`, así que la autorización se resuelve
 * aquí entera y para los dos tipos de acceso:
 *
 *  - miembro de la familia → cualquier factura de su familia;
 *  - inquilino → solo las de **su** casa y **compartidas** con él.
 *
 * Cualquier otro caso responde 404, sin distinguir «no existe» de «no puedes»:
 * un 403 confirmaría que el id es real.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("No autenticado", { status: 401 });

  const { id } = await ctx.params;

  const membresias = await prisma.membership.findMany({
    where: { userId: session.userId },
    select: { familiaId: true, rol: true, casaId: true },
  });

  const factura = await resolverArchivo(id, session.activeFamiliaId, membresias);
  if (!factura) return new Response("No encontrada", { status: 404 });

  try {
    const data = await fileStorage.read(factura.archivoPath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeDe(factura.archivoNombre),
        "Content-Disposition": `inline; filename="${factura.archivoNombre}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
}

type Membresia = { familiaId: string; rol: string; casaId: string | null };

async function resolverArchivo(
  facturaId: string,
  activeFamiliaId: string | null,
  membresias: Membresia[],
) {
  const plenas = membresias.filter((m) => m.rol !== "INQUILINO");

  // Vía de miembro: se prueba la familia activa primero y luego el resto, para
  // que un enlace de otra de sus familias siga funcionando.
  const familias = [
    ...(activeFamiliaId && plenas.some((m) => m.familiaId === activeFamiliaId)
      ? [activeFamiliaId]
      : []),
    ...plenas.map((m) => m.familiaId).filter((f) => f !== activeFamiliaId),
  ];
  for (const familiaId of familias) {
    const f = await getFacturaArchivo(familiaId, facturaId);
    if (f) return f;
  }

  // Vía de inquilino: acotada a su casa y a lo compartido.
  for (const m of membresias) {
    if (m.rol !== "INQUILINO" || !m.casaId) continue;
    const f = await archivoCompartido(m.familiaId, m.casaId, facturaId);
    if (f) return f;
  }

  return null;
}
