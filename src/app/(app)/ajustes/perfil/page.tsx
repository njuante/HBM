import { verifySession, getCurrentUser } from "@/server/auth/dal";
import { listSesiones } from "@/server/db/usuarios";
import { PageHeader } from "@/components/page-header";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const session = await verifySession();
  const [user, sesiones] = await Promise.all([
    getCurrentUser(),
    listSesiones(session.userId, session.sessionId),
  ]);

  return (
    <div>
      <PageHeader
        title="Tu perfil"
        description="Tus datos, tu contraseña y los dispositivos donde tienes la sesión abierta."
      />
      <PerfilClient user={user} sesiones={sesiones} />
    </div>
  );
}
