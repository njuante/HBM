import { cn } from "@/lib/utils";

export type LeyendaItem = {
  label: string;
  color: string;
  forma?: "barra" | "linea";
};

/**
 * Marco común de toda gráfica: título, leyenda propia y la tabla
 * equivalente para lectores de pantalla.
 *
 * La leyenda es nuestra y no la de Recharts porque la suya no admite
 * tipografía ni orden propios, y porque queremos que viva junto al título
 * y no bajo el eje, robando altura al dato.
 */
export function ChartFrame({
  titulo,
  subtitulo,
  leyenda,
  acciones,
  descripcion,
  tabla,
  children,
  className,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  leyenda?: LeyendaItem[];
  acciones?: React.ReactNode;
  /** `aria-label` del gráfico: qué muestra, en una frase. */
  descripcion: string;
  /** Equivalente textual. Sin esto la gráfica es invisible para un lector. */
  tabla?: { cabeceras: string[]; filas: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        // `min-w-0`: como ítem de grid el mínimo por defecto es `auto`, o sea
        // el min-content. Recharts fija un ancho en píxeles al SVG, así que ese
        // min-content clavaba la tarjeta a ~348px y estiraba la columna entera
        // más allá de la pantalla en cuanto el móvil bajaba de 364px.
        "flex min-w-0 flex-col rounded-lg border border-border bg-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="font-serif text-base font-medium leading-tight tracking-tight">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {leyenda && leyenda.length > 0 && (
            <ul className="flex flex-wrap items-center gap-3">
              {leyenda.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center gap-1.5 text-2xs text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block shrink-0",
                      l.forma === "linea" ? "h-px w-3.5" : "size-2 rounded-xs",
                    )}
                    style={{ backgroundColor: l.color }}
                  />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
          {acciones}
        </div>
      </header>

      <div
        className="min-w-0 flex-1 px-2 pb-3"
        role="img"
        aria-label={descripcion}
      >
        {children}
      </div>

      {/* El envoltorio es lo que recorta: sobre la propia <table>, `.sr-only`
          no basta —el <caption> se ensancha con su texto y arrastraba a la
          tabla, desbordando la página a lo ancho en móvil. */}
      {tabla && (
        <div className="sr-only">
          <table>
            <caption>{descripcion}</caption>
            <thead>
              <tr>
                {tabla.cabeceras.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.filas.map((f, i) => (
                <tr key={i}>
                  {f.map((celda, j) => (
                    <td key={j}>{celda}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
