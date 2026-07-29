import * as z from "zod";

export const registroSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.email("Introduce un email válido.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[a-zA-Z]/, "Debe contener al menos una letra.")
    .regex(/[0-9]/, "Debe contener al menos un número."),
  familia: z
    .string()
    .trim()
    .min(2, "El nombre de la familia debe tener al menos 2 caracteres."),
});

export const loginSchema = z.object({
  email: z.email("Introduce un email válido.").trim().toLowerCase(),
  password: z.string().min(1, "Introduce tu contraseña."),
});

/** Reglas de contraseña, compartidas por el registro y el cambio de clave. */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[a-zA-Z]/, "Debe contener al menos una letra.")
  .regex(/[0-9]/, "Debe contener al menos un número.");

export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.email("Introduce un email válido.").trim().toLowerCase(),
});

export const cambioPasswordSchema = z
  .object({
    actual: z.string().min(1, "Introduce tu contraseña actual."),
    nueva: passwordSchema,
    repetir: z.string(),
  })
  .refine((d) => d.nueva === d.repetir, {
    message: "Las contraseñas no coinciden.",
    path: ["repetir"],
  });

/**
 * Roles que pertenecen de verdad a la familia. `INQUILINO` queda fuera a
 * propósito: no aparece en la lista de miembros ni en el selector de rol.
 */
export type RolFamilia = "OWNER" | "ADMIN" | "MEMBER";

export const invitacionSchema = z.object({
  email: z.email("Introduce un email válido.").trim().toLowerCase(),
  rol: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PerfilInput = z.infer<typeof perfilSchema>;

// Estado devuelto por las Server Actions de auth para pintar errores en el form.
export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;
