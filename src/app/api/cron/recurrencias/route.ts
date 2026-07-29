import { materializarTodas } from "@/server/db/recurrencias";

/**
 * Materializa las recurrencias de todas las familias.
 *
 * Vía fiable para quien tenga un programador (cron del servidor, Docker):
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        http://localhost:3000/api/cron/recurrencias
 *
 * No es obligatorio: sin cron, cada familia se pone al día sola al abrir el
 * panel (ver `asegurarRecurrencias`). Sin `CRON_SECRET` definido el endpoint
 * queda cerrado, para que nadie lo llame por accidente en una instalación
 * expuesta a internet.
 */
export async function POST(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }

  const cabecera = req.headers.get("authorization");
  if (cabecera !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const res = await materializarTodas();
  return Response.json({ ok: true, ...res });
}
