import { redirect } from "next/navigation";

/**
 * Gastos e ingresos se ven ahora en una sola pantalla. La ruta se conserva
 * porque hay enlaces vivos apuntando aquí —la gráfica de reparto del panel
 * manda a `/gastos?categoriaId=…`— y porque puede estar en marcadores.
 */
export default async function GastosPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const params = new URLSearchParams({ tipo: "GASTO" });
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) params.set(k, v);
  }
  redirect(`/movimientos?${params}`);
}
