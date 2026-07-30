import "server-only";
import { prisma } from "@/lib/prisma";
import { TipoCategoria } from "@/generated/prisma/enums";

type DefCat = {
  nombre: string;
  color: string;
  icono?: string;
  hijos?: { nombre: string; color: string; icono?: string }[];
};

// Paleta por defecto: los ocho tonos del sistema (`--chart-1..8` en
// globals.css), repartidos por la rueda pero sesgados a tierra. Las
// subcategorías toman una variante del matiz de su madre, no un color
// suelto, para que el reparto por categoría se lea como una familia.
const GASTOS: DefCat[] = [
  { nombre: "Vivienda", color: "#4c4a7c", icono: "house" },
  {
    nombre: "Suministros",
    color: "#26606b",
    icono: "plug",
    hijos: [
      { nombre: "Luz", color: "#86691e", icono: "zap" },
      { nombre: "Agua", color: "#3d7f8c", icono: "droplet" },
      { nombre: "Gas", color: "#a33b28", icono: "flame" },
      { nombre: "Internet", color: "#155661", icono: "wifi" },
    ],
  },
  { nombre: "Alimentación", color: "#4a6b3d", icono: "shopping-cart" },
  { nombre: "Transporte", color: "#a85b22", icono: "car" },
  { nombre: "Salud", color: "#8e3b5c", icono: "heart-pulse" },
  { nombre: "Suscripciones", color: "#6366f1", icono: "repeat" },
  { nombre: "Ocio", color: "#2f7a5e", icono: "party-popper" },
  { nombre: "Educación", color: "#7a4a86", icono: "graduation-cap" },
  { nombre: "Otros gastos", color: "#78736b", icono: "ellipsis" },
];

const INGRESOS: DefCat[] = [
  { nombre: "Nómina", color: "#4a6b3d", icono: "wallet" },
  { nombre: "Autónomo", color: "#2f7a5e", icono: "briefcase" },
  { nombre: "Alquiler", color: "#26606b", icono: "key" },
  { nombre: "Inversiones", color: "#4c4a7c", icono: "trending-up" },
  { nombre: "Otros ingresos", color: "#78736b", icono: "ellipsis" },
];

/** Crea el set de categorías por defecto de una familia recién creada. */
export async function crearCategoriasPorDefecto(familiaId: string): Promise<void> {
  await seed(familiaId, TipoCategoria.GASTO, GASTOS);
  await seed(familiaId, TipoCategoria.INGRESO, INGRESOS);
}

async function seed(familiaId: string, tipo: TipoCategoria, defs: DefCat[]) {
  for (const def of defs) {
    const parent = await prisma.categoria.create({
      data: { familiaId, tipo, nombre: def.nombre, color: def.color, icono: def.icono },
    });
    if (def.hijos?.length) {
      await prisma.categoria.createMany({
        data: def.hijos.map((h) => ({
          familiaId,
          tipo,
          nombre: h.nombre,
          color: h.color,
          icono: h.icono,
          parentId: parent.id,
        })),
      });
    }
  }
}
