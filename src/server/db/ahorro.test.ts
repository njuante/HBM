import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearMetaAhorro,
  aportarAMetaAhorro,
  listMetasAhorro,
  eliminarMetaAhorro,
} from "./ahorro";

const S = `ahorro_${Date.now()}`;
let famId: string;
let userId: string;

beforeAll(async () => {
  const u = await prisma.user.create({
    data: { nombre: "User Ahorro", email: `ahorro_${S}@test.com`, passwordHash: "x" },
  });
  userId = u.id;

  const f = await prisma.familia.create({
    data: {
      nombre: `FamAhorro_${S}`,
      memberships: { create: { userId: u.id, rol: "OWNER" } },
    },
  });
  famId = f.id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: famId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("ahorro module", () => {
  it("crea una meta de ahorro y permite aportar y retirar dinero", async () => {
    // 1. Crear meta
    const res = await crearMetaAhorro(famId, {
      nombre: "Viaje a Japón",
      concepto: "Vuelos y hotel para vacaciones",
      objetivoImporte: 2000.0,
      color: "#ec4899",
    });

    expect(res.ok).toBe(true);
    const metaId = res.id!;

    // 2. Aportar 500 €
    await aportarAMetaAhorro(famId, userId, metaId, 500.0, "Ahorro del mes de mayo");

    let list = await listMetasAhorro(famId);
    expect(list.totalAhorradoMetas).toBe(500.0);
    expect(list.metas[0].porcentaje).toBe(25);
    expect(list.metas[0].completada).toBe(false);

    // 3. Aportar 1500 € adicionales (alcanza el 100%)
    await aportarAMetaAhorro(famId, userId, metaId, 1500.0, "Extra de verano");

    list = await listMetasAhorro(famId);
    expect(list.totalAhorradoMetas).toBe(2000.0);
    expect(list.metas[0].porcentaje).toBe(100);
    expect(list.metas[0].completada).toBe(true);

    // 4. Retirar 200 €
    await aportarAMetaAhorro(famId, userId, metaId, -200.0, "Reserva de vuelo parcial");
    list = await listMetasAhorro(famId);
    expect(list.totalAhorradoMetas).toBe(1800.0);

    // 5. Eliminar meta
    const ok = await eliminarMetaAhorro(famId, metaId);
    expect(ok).toBe(true);
  });
});
