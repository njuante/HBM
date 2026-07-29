import * as z from "zod";
import { primerDiaDeMes } from "@/lib/periodo";

// Helpers para validar datos que vienen de FormData, donde los campos ausentes
// llegan como null y los numéricos/fechas como string. Ver memoria del proyecto:
// FormData.get() devuelve null y Zod .optional() no lo acepta.

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mes 'YYYY-MM' (input type=month) → Date del día 1. */
export const mesSchema = z
  .string()
  .regex(MES_RE, "Elige un mes válido.")
  .transform((s) => primerDiaDeMes(s));

/** Mes opcional ('YYYY-MM' o vacío) → Date | undefined. */
export const opcionalMes = () =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || MES_RE.test(v), "Elige un mes válido.")
    .transform((v) => (v ? primerDiaDeMes(v) : undefined));

/** Texto opcional: normaliza null/""/espacios a undefined. */
export const opcionalTexto = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : undefined));

/** Importe monetario en euros a partir de string (admite coma decimal). */
export const importeSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(",", "."))))
  .refine((n) => Number.isFinite(n) && n > 0, "Introduce un importe mayor que 0.")
  .transform((n) => Math.round(n * 100) / 100);

/** Fecha a partir de un string 'YYYY-MM-DD' (input date). */
export const fechaSchema = z
  .string()
  .min(1, "Introduce una fecha.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida.")
  .transform((s) => new Date(s));

/** Fecha opcional ('YYYY-MM-DD' o vacío) → Date | undefined. */
export const opcionalFecha = () =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "Fecha no válida.")
    .transform((v) => (v ? new Date(v) : undefined));

/** Número opcional (input vacío) → number | undefined. */
export const opcionalNumero = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v === null || v === "" || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    });

/** Id opcional (select con opción vacía "") → undefined. */
export const opcionalId = () =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v : undefined));
