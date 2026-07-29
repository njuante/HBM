import * as z from "zod";
import { opcionalTexto } from "./helpers";
import type { Entrada } from "./form";

export const tipoCategoriaSchema = z.enum(["GASTO", "INGRESO"]);

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  tipo: tipoCategoriaSchema,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un hex tipo #RRGGBB.")
    .default("#64748b"),
  icono: opcionalTexto(40),
  // Si se indica, la categoría es subcategoría de parentId.
  parentId: opcionalTexto(60),
});

export type CategoriaInput = Entrada<z.infer<typeof categoriaSchema>>;
