import * as z from "zod";

export const rolSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const miembroSchema = z.object({
  email: z.email("Introduce un email válido.").trim().toLowerCase(),
  rol: rolSchema.default("MEMBER"),
});

export const renombrarFamiliaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
});
