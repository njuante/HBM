"use client";

/**
 * Miniserie sin ejes ni interacción. SVG a mano en vez de Recharts: son
 * cuatro líneas de trigonometría y evita montar un `ResponsiveContainer`
 * por cada tarjeta de KPI.
 */
export function Sparkline({
  data,
  color,
  width = 76,
  height = 22,
  className,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const rango = max - min || 1;
  const paso = width / (data.length - 1);

  const puntos = data.map((v, i) => {
    const x = i * paso;
    // 1.5px de margen arriba y abajo para que el trazo no se recorte.
    const y = height - 1.5 - ((v - min) / rango) * (height - 3);
    return [x, y] as const;
  });

  const linea = puntos.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${linea} L${width} ${height} L0 ${height} Z`;
  const [ux, uy] = puntos[puntos.length - 1];
  const id = `spark-${color.replace("#", "")}`;

  return (
    <svg
      aria-hidden
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      overflow="visible"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={linea}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ux} cy={uy} r={1.75} fill={color} />
    </svg>
  );
}
