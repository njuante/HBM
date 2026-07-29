"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/server/auth/dal";
import { setActiveFamilia } from "@/lib/session";
import { crearCategoriasPorDefecto } from "@/server/db/categorias-default";
import { renombrarFamiliaSchema } from "@/lib/validation/familia";
import { flattenZodErrors, type FormState } from "@/lib/validation/form";
import { Rol } from "@/generated/prisma/enums";

export async function crearFamiliaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();

  const parsed = renombrarFamiliaSchema.safeParse({
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) return { errors: flattenZodErrors(parsed.error) };

  const fam = await prisma.familia.create({ data: { nombre: parsed.data.nombre } });
  await prisma.membership.create({
    data: { userId: session.userId, familiaId: fam.id, rol: Rol.OWNER },
  });
  await crearCategoriasPorDefecto(fam.id);
  await setActiveFamilia(fam.id);
  redirect("/dashboard");
}
