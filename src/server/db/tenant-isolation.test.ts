// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listCasas,
  getCasa,
  crearCasa,
  actualizarCasa,
  eliminarCasa,
} from "@/server/db/casas";
import {
  cambiarRol,
  eliminarMiembro,
  listMiembros,
} from "@/server/db/familia";

// Sufijo único para no chocar con otros datos de la BD de dev.
const S = `iso_${Date.now()}`;

let famA: string;
let famB: string;
let casaA: string;
let casaB: string;

beforeAll(async () => {
  const a = await prisma.familia.create({ data: { nombre: `A_${S}` } });
  const b = await prisma.familia.create({ data: { nombre: `B_${S}` } });
  famA = a.id;
  famB = b.id;
  casaA = (await crearCasa(famA, { nombre: "Casa A" })).id;
  casaB = (await crearCasa(famB, { nombre: "Casa B" })).id;
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [famA, famB] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("aislamiento multi-tenant en casas", () => {
  it("listCasas solo devuelve las casas de la familia", async () => {
    const casas = await listCasas(famA);
    const ids = casas.map((c) => c.id);
    expect(ids).toContain(casaA);
    expect(ids).not.toContain(casaB);
  });

  it("no se puede leer una casa de otra familia", async () => {
    expect(await getCasa(famA, casaB)).toBeNull();
  });

  it("no se puede actualizar una casa de otra familia", async () => {
    const ok = await actualizarCasa(famA, casaB, { nombre: "Hackeada" });
    expect(ok).toBe(false);
    const casa = await prisma.casa.findUnique({ where: { id: casaB } });
    expect(casa?.nombre).toBe("Casa B");
  });

  it("no se puede eliminar una casa de otra familia", async () => {
    const ok = await eliminarCasa(famA, casaB);
    expect(ok).toBe(false);
    expect(await prisma.casa.findUnique({ where: { id: casaB } })).not.toBeNull();
  });
});

describe("protección de roles en la familia", () => {
  it("no permite quedarse sin OWNER al cambiar rol", async () => {
    const [owner] = await listMiembrosOwner(famA);
    // famA aún no tiene miembros; creamos un usuario OWNER.
    const user = await prisma.user.create({
      data: { nombre: "Owner", email: `owner_${S}@t.com`, passwordHash: "x" },
    });
    const m = await prisma.membership.create({
      data: { userId: user.id, familiaId: famA, rol: "OWNER" },
    });

    const res = await cambiarRol(famA, m.id, "MEMBER");
    expect(res.ok).toBe(false);

    // sigue siendo OWNER
    const check = await prisma.membership.findUnique({ where: { id: m.id } });
    expect(check?.rol).toBe("OWNER");
    void owner;
  });

  it("no permite eliminar al único OWNER", async () => {
    const miembros = await listMiembros(famA);
    const owner = miembros.find((x) => x.rol === "OWNER")!;
    const res = await eliminarMiembro(famA, owner.id);
    expect(res.ok).toBe(false);
  });

});

// Helper trivial usado arriba (evita import extra).
async function listMiembrosOwner(familiaId: string) {
  return prisma.membership.findMany({ where: { familiaId, rol: "OWNER" } });
}
