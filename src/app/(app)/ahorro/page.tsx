import { requireFamilia } from "@/server/auth/dal";
import { listMetasAhorro } from "@/server/db/ahorro";
import { AhorroClient } from "./ahorro-client";

export default async function AhorroPage() {
  const ctx = await requireFamilia();
  const resumen = await listMetasAhorro(ctx.familiaId);

  return <AhorroClient resumen={resumen} />;
}
