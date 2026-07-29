"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ExternalLink,
  EyeOff,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { formatFecha, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SwitchEnvio } from "@/components/ui/switch-envio";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FacturaForm, type Opt } from "./factura-form";
import {
  actualizarFacturaAction,
  cambiarEstadoPagoAction,
  compartirFacturaAction,
  crearFacturaAction,
  eliminarFacturaAction,
} from "./actions";

export type FacturaItem = {
  id: string;
  emisor: string | null;
  numeroFactura: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  estadoPago: "PENDIENTE" | "PAGADA";
  archivoTipo: "PDF" | "IMAGEN";
  casa: { id: string; nombre: string } | null;
  gasto: { id: string; concepto: string } | null;
  compartida: boolean;
  pagoDeclarado: boolean;
  casaEnAlquiler: boolean;
  consumo: number | null;
  periodo: string | null;
};

export type Filtros = { estadoPago?: string; texto?: string };

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "PAGADA", label: "Pagadas" },
] as const;

export function FacturasClient({
  items,
  casas,
  gastosDisponibles,
  filtros,
  alquileresActivo,
  puedeGestionar,
}: {
  items: FacturaItem[];
  casas: Opt[];
  gastosDisponibles: Opt[];
  filtros: Filtros;
  alquileresActivo: boolean;
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [subiendo, setSubiendo] = React.useState(false);
  const [editando, setEditando] = React.useState<FacturaItem | null>(null);
  const [texto, setTexto] = React.useState(filtros.texto ?? "");

  const hayFiltros = Boolean(filtros.estadoPago || filtros.texto);

  const navegar = (cambios: Partial<Filtros>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filtros, ...cambios })) {
      if (v) params.set(k, v);
    }
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navegar({ texto });
          }}
          className="relative min-w-48 flex-1 sm:max-w-72"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => texto !== (filtros.texto ?? "") && navegar({ texto })}
            placeholder="Emisor o nº de factura…"
            aria-label="Buscar"
            className="h-8 pl-8 text-xs"
          />
        </form>

        <Segmented
          ariaLabel="Estado"
          value={filtros.estadoPago ?? ""}
          onChange={(v) => navegar({ estadoPago: v })}
          options={[...ESTADOS]}
        />

        <Button className="ml-auto" onClick={() => setSubiendo(true)}>
          <Upload />
          Subir factura
        </Button>
      </div>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            titulo={
              hayFiltros ? "Ninguna factura con estos filtros" : "Aún no hay facturas"
            }
            descripcion={
              hayFiltros
                ? "Prueba con otro estado o vacía la búsqueda."
                : "Sube el PDF o la foto de una factura y HBM te avisará antes de que venza."
            }
            accion={
              !hayFiltros && (
                <Button size="sm" onClick={() => setSubiendo(true)}>
                  <Upload />
                  Subir factura
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="w-10" />
                  <TH>Emisor</TH>
                  <TH className="w-28">Vence</TH>
                  <TH>Casa</TH>
                  <TH className="w-24">Pagada</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {items.map((f) => (
                  <Fila
                    compartible={alquileresActivo && puedeGestionar}
                    key={f.id}
                    f={f}
                    onEditar={() => setEditando(f)}
                  />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <Dialog open={subiendo} onOpenChange={setSubiendo}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Subir factura</DialogTitle>
          </DialogHeader>
          <FacturaForm
            casas={casas}
            gastos={gastosDisponibles}
            action={crearFacturaAction}
            onCancel={() => setSubiendo(false)}
            onOk={() => setSubiendo(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar factura</DialogTitle>
          </DialogHeader>
          {editando && (
            <FacturaForm
              key={editando.id}
              casas={casas}
              gastos={gastosDisponibles}
              conArchivo={false}
              submitLabel="Guardar cambios"
              defaults={{
                id: editando.id,
                emisor: editando.emisor,
                numeroFactura: editando.numeroFactura,
                fechaEmision: editando.fechaEmision
                  ? toDateInputValue(editando.fechaEmision)
                  : "",
                fechaVencimiento: editando.fechaVencimiento
                  ? toDateInputValue(editando.fechaVencimiento)
                  : "",
                estadoPago: editando.estadoPago,
                casaId: editando.casa?.id ?? "",
                gastoId: editando.gasto?.id ?? "",
                consumo: editando.consumo,
                periodo: editando.periodo,
              }}
              action={actualizarFacturaAction}
              onCancel={() => setEditando(null)}
              onOk={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Fila({
  f,
  onEditar,
  compartible,
}: {
  f: FacturaItem;
  onEditar: () => void;
  /** El módulo de alquileres está activo y quien mira puede gestionar. */
  compartible: boolean;
}) {
  const [confirmando, setConfirmando] = React.useState(false);

  const vencida =
    f.estadoPago === "PENDIENTE" &&
    f.fechaVencimiento != null &&
    new Date(f.fechaVencimiento) < new Date();

  const Icono = f.archivoTipo === "PDF" ? FileText : ImageIcon;
  const nombre = f.emisor ?? (f.numeroFactura ? `Nº ${f.numeroFactura}` : "Factura");

  return (
    <TR>
      <TD className="pl-3 pr-0">
        <Tooltip texto="Abrir el archivo">
          <a
            href={`/api/facturas/${f.id}/archivo`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir archivo de ${nombre}`}
            className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Icono className="size-3.5" />
          </a>
        </Tooltip>
      </TD>

      <TD>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{nombre}</span>
          {vencida && <Badge variant="danger">vencida</Badge>}
          {f.compartida && (
            <Tooltip texto="El inquilino puede verla">
              <Share2 className="size-3 text-faint" />
            </Tooltip>
          )}
          {f.pagoDeclarado && f.estadoPago === "PENDIENTE" && (
            <Badge variant="warning">pago avisado</Badge>
          )}
        </div>
        <span className="text-2xs text-faint">
          {f.numeroFactura && f.emisor ? `Nº ${f.numeroFactura}` : null}
          {f.gasto && (f.numeroFactura && f.emisor ? " · " : "")}
          {f.gasto?.concepto}
          {f.periodo && ` · ${f.periodo}`}
        </span>
      </TD>

      <TD
        className={cn(
          "whitespace-nowrap text-xs",
          vencida ? "text-danger" : "text-muted-foreground",
        )}
      >
        {f.fechaVencimiento ? formatFecha(f.fechaVencimiento) : "—"}
      </TD>

      <TD className="truncate text-xs text-muted-foreground">
        {f.casa?.nombre ?? "—"}
      </TD>

      <TD>
        {/* El estado se cambia en el sitio: es la acción más frecuente y no
            merece abrir un formulario. */}
        <SwitchEnvio
          action={cambiarEstadoPagoAction}
          name="pagada"
          defaultChecked={f.estadoPago === "PAGADA"}
          ariaLabel={`Marcar ${nombre} como pagada`}
          campos={{ id: f.id }}
        />
      </TD>

      <TD className="pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Acciones de ${nombre}`}
              className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEditar}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`/api/facturas/${f.id}/archivo`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink />
                Abrir archivo
              </a>
            </DropdownMenuItem>
            {compartible && f.casaEnAlquiler && (
              <DropdownMenuItem asChild>
                <form action={compartirFacturaAction}>
                  <input type="hidden" name="id" value={f.id} />
                  {!f.compartida && (
                    <input type="hidden" name="compartir" value="on" />
                  )}
                  <button type="submit" className="flex w-full items-center gap-2">
                    {f.compartida ? <EyeOff /> : <Share2 />}
                    {f.compartida
                      ? "Dejar de compartir"
                      : "Compartir con el inquilino"}
                  </button>
                </form>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              peligro
              onSelect={(e) => {
                e.preventDefault();
                setTimeout(() => setConfirmando(true), 0);
              }}
            >
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmarAccion
          open={confirmando}
          onOpenChange={setConfirmando}
          titulo={`¿Eliminar la factura de ${nombre}?`}
          descripcion="Se borrará también el archivo subido. No se puede deshacer."
          onConfirmar={() => {
            const fd = new FormData();
            fd.set("id", f.id);
            void eliminarFacturaAction(fd);
          }}
        />
      </TD>
    </TR>
  );
}
