// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearInvitacion,
  resolverInvitacion,
  aceptarInvitacion,
  listInvitaciones,
  revocarInvitacion,
} from "@/server/db/invitaciones";
import { listMiembros } from "@/server/db/familia";
import { abandonarFamilia, cambiarPassword } from "@/server/db/usuarios";
import { Rol } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";

const S = `inv_${Date.now()}`;

let fam: string;
let otraFam: string;
let owner: string;
let invitado: string;
let ajeno: string;

const emailInvitado = `invitado_${S}@t.com`;

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  otraFam = (await prisma.familia.create({ data: { nombre: `O_${S}` } })).id;

  owner = (
    await prisma.user.create({
      data: { nombre: "Owner", email: `own_${S}@t.com`, passwordHash: "x" },
    })
  ).id;
  invitado = (
    await prisma.user.create({
      data: { nombre: "Invitado", email: emailInvitado, passwordHash: "x" },
    })
  ).id;
  ajeno = (
    await prisma.user.create({
      data: { nombre: "Ajeno", email: `ajeno_${S}@t.com`, passwordHash: "x" },
    })
  ).id;

  await prisma.membership.create({
    data: { userId: owner, familiaId: fam, rol: Rol.OWNER },
  });
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: { in: [fam, otraFam] } } });
  await prisma.user.deleteMany({ where: { email: { contains: S } } });
});

describe("invitaciones", () => {
  it("el token solo se devuelve al crearla y no se guarda en claro", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: emailInvitado,
      rol: Rol.MEMBER,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const fila = await prisma.invitacion.findUnique({ where: { id: res.id } });
    expect(fila?.tokenHash).not.toBe(res.token);
    expect(fila?.tokenHash).toHaveLength(64); // sha-256 en hexadecimal
  });

  it("se resuelve con el token bueno y no con otro", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: `otro_${S}@t.com`,
      rol: Rol.MEMBER,
    });
    if (!res.ok) return;

    expect(await resolverInvitacion(res.token)).not.toBeNull();
    expect(await resolverInvitacion("token-inventado")).toBeNull();
    expect(await resolverInvitacion("")).toBeNull();

    await revocarInvitacion(fam, res.id);
    expect(await resolverInvitacion(res.token)).toBeNull();
  });

  it("una invitación caducada no vale", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: `caduca_${S}@t.com`,
      rol: Rol.MEMBER,
    });
    if (!res.ok) return;

    await prisma.invitacion.update({
      where: { id: res.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await resolverInvitacion(res.token)).toBeNull();
  });

  it("no la acepta quien no es el email invitado", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: emailInvitado,
      rol: Rol.MEMBER,
    });
    if (!res.ok) return;

    const intruso = await aceptarInvitacion(res.token, ajeno);
    expect(intruso.ok).toBe(false);
    expect(await listMiembros(fam)).toHaveLength(1);
  });

  it("se acepta una vez y solo una", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: emailInvitado,
      rol: Rol.MEMBER,
    });
    if (!res.ok) return;

    const primera = await aceptarInvitacion(res.token, invitado);
    expect(primera.ok).toBe(true);
    expect(await listMiembros(fam)).toHaveLength(2);

    // Reutilizar el enlace ya no vale.
    expect(await resolverInvitacion(res.token)).toBeNull();
    const segunda = await aceptarInvitacion(res.token, invitado);
    expect(segunda.ok).toBe(false);
  });

  it("un MEMBER no puede invitar, y un ADMIN no nombra OWNER", async () => {
    const deMiembro = await crearInvitacion(fam, invitado, Rol.MEMBER, {
      email: `x_${S}@t.com`,
      rol: Rol.MEMBER,
    });
    expect(deMiembro.ok).toBe(false);

    const deAdmin = await crearInvitacion(fam, invitado, Rol.ADMIN, {
      email: `y_${S}@t.com`,
      rol: Rol.OWNER,
    });
    expect(deAdmin.ok).toBe(false);
  });

  it("no se invita a quien ya está dentro", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: emailInvitado,
      rol: Rol.MEMBER,
    });
    expect(res.ok).toBe(false);
  });

  it("otra familia no ve las invitaciones ni las revoca", async () => {
    const res = await crearInvitacion(fam, owner, Rol.OWNER, {
      email: `visible_${S}@t.com`,
      rol: Rol.MEMBER,
    });
    if (!res.ok) return;

    expect(await listInvitaciones(otraFam)).toHaveLength(0);
    expect(await revocarInvitacion(otraFam, res.id)).toBe(false);
    expect(await resolverInvitacion(res.token)).not.toBeNull();
  });
});

describe("cuenta y pertenencia", () => {
  it("un miembro puede salirse solo, el único OWNER no", async () => {
    expect((await abandonarFamilia(fam, owner)).ok).toBe(false);

    const salida = await abandonarFamilia(fam, invitado);
    expect(salida.ok).toBe(true);
    expect(await listMiembros(fam)).toHaveLength(1);
  });

  it("cambiar la contraseña cierra las demás sesiones", async () => {
    const usuario = await prisma.user.update({
      where: { id: ajeno },
      data: { passwordHash: await bcrypt.hash("Password123", 10) },
    });

    const sesiones = await Promise.all(
      ["a", "b", "c"].map((t) =>
        prisma.session.create({
          data: {
            token: `${S}_${t}`,
            userId: usuario.id,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        }),
      ),
    );

    const mala = await cambiarPassword(
      usuario.id,
      sesiones[0].id,
      "incorrecta",
      "Password456",
    );
    expect(mala.ok).toBe(false);

    const buena = await cambiarPassword(
      usuario.id,
      sesiones[0].id,
      "Password123",
      "Password456",
    );
    expect(buena.ok).toBe(true);

    const vivas = await prisma.session.findMany({ where: { userId: usuario.id } });
    expect(vivas).toHaveLength(1);
    expect(vivas[0].id).toBe(sesiones[0].id);
  });
});
