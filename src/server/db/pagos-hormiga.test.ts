import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { obtenerPagosHormiga } from "./pagos-hormiga";
import { crearGasto } from "./gastos";
import { crearCasa } from "./casas";
import { crearCategoria } from "./categorias";
import { mesActual } from "@/lib/periodo";

const S = `hormiga_${Date.now()}`;
let famId: string;
let userId: string;
let casaId: string;
let catId: string;

beforeAll(async () => {
  const u = await prisma.user.create({
    data: { nombre: "User Hormiga", email: `hormiga_${S}@test.com`, passwordHash: "x" },
  });
  userId = u.id;

  const f = await prisma.familia.create({
    data: {
      nombre: `FamHormiga_${S}`,
      memberships: { create: { userId: u.id, rol: "OWNER" } },
    },
  });
  famId = f.id;

  const casa = await crearCasa(famId, { nombre: "Casa Hormiga" });
  casaId = casa.id;

  const catRes = await crearCategoria(famId, {
    tipo: "GASTO",
    nombre: "Varios Micro",
    color: "#eab308",
  });
  if (catRes.ok) catId = catRes.id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: famId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("obtenerPagosHormiga", () => {
  it("calcula correctamente el resumen de Pagos Hormiga para gastos <= 20€", async () => {
    // Crear gastos normales y micro-gastos
    await crearGasto(famId, userId, {
      casaId,
      categoriaId: catId,
      importe: 1.99,
      fecha: new Date(),
      concepto: "PrimeVideo Ad free",
      recurrente: false,
    });

    await crearGasto(famId, userId, {
      casaId,
      categoriaId: catId,
      importe: 18.0,
      fecha: new Date(),
      concepto: "Claude Sub",
      recurrente: false,
    });

    await crearGasto(famId, userId, {
      casaId,
      categoriaId: catId,
      importe: 250.0, // Gasto grande (> 20€)
      fecha: new Date(),
      concepto: "Compra Electrodomésticos",
      recurrente: false,
    });

    const res = await obtenerPagosHormiga(famId, mesActual(), 20.0);

    expect(res.cantidadMovimientos).toBe(2);
    expect(res.totalMes).toBe(19.99);
    expect(res.proyeccionAnual).toBe(239.88);
    expect(res.topConceptos.length).toBe(2);
  });
});
