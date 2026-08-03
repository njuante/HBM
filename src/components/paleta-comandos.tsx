"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowLeftRight,
  Home,
  KeyRound,
  LayoutDashboard,
  PiggyBank,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/dialog";
import { Money } from "@/components/ui/money";
import { buscarAction } from "@/app/(app)/buscar";
import type { Resultado } from "@/server/db/busqueda";

type Destino = { href: string; label: string; icon: React.ElementType };

const IR_A: Destino[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/facturas", label: "Facturas", icon: ReceiptText },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/casas", label: "Casas", icon: Home },
  { href: "/familia", label: "Familia", icon: Users },
];

const HACER: Destino[] = [
  { href: "/movimientos?nuevo=1", label: "Nuevo movimiento", icon: Plus },
  { href: "/facturas?nuevo=1", label: "Subir factura", icon: Upload },
  { href: "/recurrentes?nuevo=1", label: "Nueva recurrencia", icon: Repeat },
  { href: "/presupuestos?nuevo=1", label: "Nuevo presupuesto", icon: PiggyBank },
];

const ICONO_RESULTADO = {
  GASTO: ArrowLeftRight,
  INGRESO: ArrowLeftRight,
  FACTURA: ReceiptText,
} as const;

/**
 * Paleta de comandos: ir a cualquier sitio, empezar cualquier alta y encontrar
 * un movimiento o una factura por su nombre, sin soltar el teclado.
 *
 * Es la única vía rápida de la app que no depende de saber dónde está cada
 * cosa, y la que da sentido a los atajos: `⌘K` la abre desde cualquier parte.
 */
export function PaletaComandos({
  abierta,
  onOpenChange,
  alquileresActivo,
}: {
  abierta: boolean;
  onOpenChange: (v: boolean) => void;
  alquileresActivo: boolean;
}) {
  const router = useRouter();
  const [consulta, setConsulta] = React.useState("");
  const [resultados, setResultados] = React.useState<Resultado[]>([]);
  const [buscando, setBuscando] = React.useState(false);

  /**
   * La búsqueda va contra el servidor, así que se espera a que el usuario deje
   * de teclear en vez de disparar una consulta por pulsación. Se lanza desde el
   * propio manejador y no desde un efecto: el efecto solo limpia el temporizador.
   */
  const temporizador = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const alEscribir = (v: string) => {
    setConsulta(v);
    if (temporizador.current) clearTimeout(temporizador.current);

    const q = v.trim();
    if (q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      try {
        setResultados(await buscarAction(q));
      } finally {
        setBuscando(false);
      }
    }, 220);
  };

  React.useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const ir = (href: string) => {
    onOpenChange(false);
    setConsulta("");
    router.push(href);
  };

  const destinos = alquileresActivo
    ? [...IR_A, { href: "/alquileres", label: "Alquileres", icon: KeyRound }]
    : IR_A;

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 top-[12vh] z-50 mx-auto w-[calc(100vw-2rem)] max-w-lg",
            "overflow-hidden rounded-xl border border-border bg-card shadow-xl",
            "data-[state=open]:animate-panel-in data-[state=closed]:animate-panel-out",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Buscar y navegar
          </DialogPrimitive.Title>

          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b border-border px-3.5">
              <Search className="size-4 shrink-0 text-faint" />
              <Command.Input
                value={consulta}
                onValueChange={alEscribir}
                placeholder="Busca un movimiento, una factura o una sección…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </div>

            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {buscando ? "Buscando…" : "Nada por aquí"}
              </Command.Empty>

              {resultados.length > 0 && (
                <Grupo titulo="Resultados">
                  {resultados.map((r) => {
                    const Icono = ICONO_RESULTADO[r.tipo];
                    return (
                      <Item key={`${r.tipo}-${r.id}`} onSelect={() => ir(r.href)}>
                        <Icono className="size-3.5 shrink-0 text-faint" />
                        <span className="min-w-0 flex-1 truncate">{r.titulo}</span>
                        {r.detalle && (
                          <span className="shrink-0 text-2xs text-faint">
                            {r.detalle}
                          </span>
                        )}
                        {r.importe !== null && (
                          <Money value={r.importe} tono="auto" signo className="text-xs" />
                        )}
                      </Item>
                    );
                  })}
                </Grupo>
              )}

              <Grupo titulo="Hacer">
                {HACER.map((d) => (
                  <Item key={d.href} onSelect={() => ir(d.href)}>
                    <d.icon className="size-3.5 shrink-0 text-faint" />
                    {d.label}
                  </Item>
                ))}
              </Grupo>

              <Grupo titulo="Ir a">
                {destinos.map((d) => (
                  <Item key={d.href} onSelect={() => ir(d.href)}>
                    <d.icon className="size-3.5 shrink-0 text-faint" />
                    {d.label}
                  </Item>
                ))}
              </Grupo>
            </Command.List>

            <div className="flex items-center gap-1.5 border-t border-border bg-muted/40 px-3.5 py-2 text-2xs text-faint">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              moverse
              <span className="mx-1 text-border-strong">·</span>
              <Kbd>↵</Kbd>
              abrir
              <span className="mx-1 text-border-strong">·</span>
              <Kbd>esc</Kbd>
              cerrar
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={titulo}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-faint"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  onSelect,
  children,
}: {
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
    >
      {children}
    </Command.Item>
  );
}
