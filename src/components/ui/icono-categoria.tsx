import { createElement } from "react";
import { iconoCategoria } from "@/lib/iconos";

/**
 * Pinta el icono de una categoría a partir de su nombre lucide.
 *
 * Usa `createElement` con el tipo resuelto del mapa en vez de asignarlo a un
 * `const Icono` en el cuerpo del render: aquello parece crear un componente
 * nuevo en cada pasada y hace que React remonte el subárbol.
 */
export function IconoCategoria({
  nombre,
  className,
  color,
}: {
  nombre?: string | null;
  className?: string;
  color?: string;
}) {
  return createElement(iconoCategoria(nombre), {
    className,
    style: color ? { color } : undefined,
  });
}

/**
 * Icono si la categoría tiene uno; si no, un punto de su color. Repetir el
 * icono genérico en toda una lista no distingue nada.
 */
export function MarcaCategoria({
  icono,
  color,
  className = "size-3.5",
  puntoClassName = "size-2 shrink-0 rounded-full",
}: {
  icono?: string | null;
  color: string;
  className?: string;
  puntoClassName?: string;
}) {
  if (!icono) {
    return (
      <span
        aria-hidden
        className={puntoClassName}
        style={{ backgroundColor: color }}
      />
    );
  }
  return <IconoCategoria nombre={icono} className={className} color={color} />;
}
