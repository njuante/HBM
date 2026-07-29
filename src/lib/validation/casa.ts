import * as z from "zod";

export const casaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  direccion: z
    .string()
    .trim()
    .max(200, "La dirección es demasiado larga.")
    .optional()
    .or(z.literal("")),
});

export type CasaInput = z.infer<typeof casaSchema>;
