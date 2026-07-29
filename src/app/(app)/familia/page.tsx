import { requireFamilia, puedeGestionar } from "@/server/auth/dal";
import { listMiembros } from "@/server/db/familia";
import { listInvitaciones } from "@/server/db/invitaciones";
import { PageHeader } from "@/components/page-header";
import { FamiliaClient, type MiembroDTO } from "./familia-client";

export default async function FamiliaPage() {
  const ctx = await requireFamilia();
  const [miembros, invitaciones] = await Promise.all([
    listMiembros(ctx.familiaId),
    listInvitaciones(ctx.familiaId),
  ]);

  const dto: MiembroDTO[] = miembros.map((m) => ({
    id: m.id,
    rol: m.rol as MiembroDTO["rol"],
    userId: m.user.id,
    nombre: m.user.nombre,
    email: m.user.email,
  }));

  return (
    <div>
      <PageHeader
        title="Familia"
        description="Miembros de tu hogar y sus permisos."
      />
      <FamiliaClient
        familiaNombre={ctx.familia.nombre}
        miembros={dto}
        currentUserId={ctx.userId}
        esOwner={ctx.rol === "OWNER"}
        puedeGestionar={puedeGestionar(ctx)}
        invitaciones={invitaciones}
        alquileresActivo={ctx.alquileresActivo}
      />
    </div>
  );
}
