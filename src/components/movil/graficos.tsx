import { cn } from "@/lib/utils";
import { tonosCategoria } from "@/lib/color-categoria";

/* ══════════════════════════════════════════════════════════════════════
   Gráficos del panel móvil.

   Van en SVG a mano y no con Recharts a propósito. Recharts mide el
   contenedor en el cliente, pinta un <svg> con un ancho en píxeles y trae
   su propia caja de ejes y leyendas; aquí no hace falta nada de eso. Estas
   piezas son `viewBox` puro con `preserveAspectRatio`, así que:

   - se dibujan en el servidor y llegan pintadas, sin salto ni medición;
   - escalan con el contenedor sin JavaScript;
   - no arrastran el tamaño intrínseco que descuadraba la rejilla en móvil.

   La animación es CSS, así que tampoco necesitan ser componentes cliente.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Convierte una serie en una curva suave (Catmull-Rom pasado a Bézier).
 *
 * Con segmentos rectos, seis meses de datos parecen un electrocardiograma.
 * La tensión a 1/6 es la equivalencia estándar: pasa por todos los puntos
 * sin inventarse los picos que una spline libre se saca de la manga.
 */
function rutaSuave(puntos: { x: number; y: number }[]): string {
  if (puntos.length === 0) return "";
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;

  let d = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Área de tendencia a sangre, para el fondo de la tarjeta de saldo.
 *
 * No lleva ejes ni cifras: no es un gráfico para leer valores, es la forma
 * del periodo. El dato exacto ya está escrito en grande encima.
 */
export function AreaTendencia({
  serie,
  className,
  id,
}: {
  serie: number[];
  className?: string;
  /** Necesario para que dos áreas en la misma página no compartan degradado. */
  id: string;
}) {
  if (serie.length < 2) return null;

  const An = 100;
  const Al = 40;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  // Rango plano (todos los meses iguales): se dibuja centrada en vez de
  // dividir por cero y mandar la línea al infinito.
  const rango = max - min || 1;

  const puntos = serie.map((v, i) => ({
    x: (i / (serie.length - 1)) * An,
    // Un margen arriba y abajo evita que la curva se pegue al borde.
    y: Al - 4 - ((v - min) / rango) * (Al - 10),
  }));

  const linea = rutaSuave(puntos);
  const area = `${linea} L ${An} ${Al} L 0 ${Al} Z`;

  return (
    <svg
      viewBox={`0 0 ${An} ${Al}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`${id}-relleno`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-relleno)`} />
      <path
        d={linea}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.9"
      />
    </svg>
  );
}

/** Longitud de un arco de radio `r` para una fracción `f` de la vuelta. */
const arco = (r: number, f: number) => 2 * Math.PI * r * Math.min(f, 1);

/**
 * Dos anillos concéntricos: lo que entra fuera, lo que sale dentro.
 *
 * Se lee de un vistazo lo único que importa aquí —si el aro de dentro
 * alcanza al de fuera, el mes se ha comido lo que entró—, sin tener que
 * comparar dos cifras mentalmente.
 */
export function AnilloFlujo({
  ingresos,
  gastos,
  className,
}: {
  ingresos: number;
  gastos: number;
  className?: string;
}) {
  // Los dos aros se miden contra el mismo techo; si no, el más pequeño
  // llenaría su vuelta y parecería que va igual de lleno que el grande.
  const techo = Math.max(ingresos, gastos) || 1;
  const rFuera = 42;
  const rDentro = 30;
  const grosor = 9;

  const anillos = [
    { r: rFuera, valor: ingresos, clase: "text-success" },
    { r: rDentro, valor: gastos, clase: "text-danger" },
  ];

  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("size-full", className)}>
      {/* -90° para que los aros arranquen arriba y no a las tres en punto. */}
      <g transform="rotate(-90 50 50)">
        {anillos.map(({ r, valor, clase }) => (
          <g key={r} className={clase}>
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={grosor}
              opacity="0.14"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={grosor}
              strokeLinecap="round"
              strokeDasharray={`${arco(r, valor / techo).toFixed(2)} ${(2 * Math.PI * r).toFixed(2)}`}
              // La animación la define `globals.css`; aquí solo se le pasa
              // el destino como variable para que crezca desde cero.
              className="anillo-crece"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Arco de consumo del presupuesto: 270° en vez de la vuelta entera.
 *
 * El hueco de abajo deja sitio a la cifra sin apretarla contra el trazo, y
 * hace evidente dónde empieza y acaba la escala.
 */
export function ArcoConsumo({
  fraccion,
  className,
  tono = "primary",
}: {
  fraccion: number;
  className?: string;
  tono?: "primary" | "danger" | "warning";
}) {
  const r = 40;
  const vuelta = 2 * Math.PI * r;
  const abarca = 0.75; // 270°
  const usado = Math.min(Math.max(fraccion, 0), 1) * abarca;

  const color =
    tono === "danger" ? "text-danger" : tono === "warning" ? "text-warning" : "text-primary";

  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("size-full", className)}>
      <g transform="rotate(135 50 50)">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(vuelta * abarca).toFixed(2)} ${vuelta.toFixed(2)}`}
          className="text-muted-foreground opacity-20"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(vuelta * usado).toFixed(2)} ${vuelta.toFixed(2)}`}
          className={cn(color, "anillo-crece")}
        />
      </g>
    </svg>
  );
}

/**
 * Barras de un vistazo para el reparto por categoría.
 *
 * Se prefieren a un donut: comparar longitudes desde una misma línea de
 * salida es inmediato, y comparar ángulos no lo es. El donut queda para la
 * web, donde hay sitio para las etiquetas alrededor.
 */
export function BarraReparto({
  fraccion,
  color,
  className,
}: {
  fraccion: number;
  /** Hex crudo de la categoría; aquí se resuelve para los dos temas. */
  color: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className="cat barra-crece h-full rounded-full"
        style={{
          ...tonosCategoria(color),
          backgroundColor: "var(--cat)",
          // El ancho final viaja como variable: la animación vive en el CSS.
          ["--destino" as string]: `${Math.min(fraccion, 1) * 100}%`,
        }}
      />
    </div>
  );
}
