"use client";

import * as React from "react";
import {
  KeyRound,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EnlaceCopiable } from "@/components/ui/enlace-copiable";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
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
import { formatFecha, toDateInputValue } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import type { FormState } from "@/lib/validation/form";
import type { ContratoDTO } from "@/lib/validation/alquiler";
import {
  actualizarContratoAction,
  cerrarContratoAction,
  crearContratoAction,
  eliminarContratoAction,
  invitarInquilinoAction,
  revocarAccesoAction,
} from "./actions";

type CasaOpt = { id: string; nombre: string; enAlquiler: boolean };

const ACCESO = {
  SIN_INVITAR: { texto: "Sin acceso", variant: "neutral" as const },
  INVITADO: { texto: "Invitado", variant: "warning" as const },
  ACTIVO: { texto: "Con acceso", variant: "success" as const },
};

export function AlquileresClient({
  contratos,
  casas,
  puedeGestionar,
}: {
  contratos: ContratoDTO[];
  casas: CasaOpt[];
  puedeGestionar: boolean;
}) {
  const [editando, setEditando] = React.useState<ContratoDTO | null>(null);
  const [creando, setCreando] = React.useState(false);
  const [invitando, setInvitando] = React.useState<ContratoDTO | null>(null);

  return (
    <div>
      <PageHeader
        title="Alquileres"
        description="Contratos, rentas y lo que compartes con cada inquilino."
        action={
          puedeGestionar && (
            <Button onClick={() => setCreando(true)}>
              <Plus />
              Nuevo contrato
            </Button>
          )
        }
      />

      {contratos.length === 0 ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            titulo="Todavía no hay contratos"
            descripcion="Crea uno con la casa, el inquilino y la renta. Después podrás darle acceso a su panel y compartirle facturas."
            accion={
              puedeGestionar && (
                <Button size="sm" onClick={() => setCreando(true)}>
                  <Plus />
                  Nuevo contrato
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Vivienda</TH>
                  <TH>Inquilino</TH>
                  <TH numerico className="w-28">
                    Renta
                  </TH>
                  <TH className="w-28">Desde</TH>
                  <TH className="w-28">Acceso</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {contratos.map((c) => (
                  <FilaContrato
                    key={c.id}
                    c={c}
                    puedeGestionar={puedeGestionar}
                    onEditar={() => setEditando(c)}
                    onInvitar={() => setInvitando(c)}
                  />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      <ContratoDialog
        abierto={creando}
        onOpenChange={setCreando}
        action={crearContratoAction}
        casas={casas}
      />
      <ContratoDialog
        key={editando?.id}
        contrato={editando ?? undefined}
        abierto={editando !== null}
        onOpenChange={(v) => !v && setEditando(null)}
        action={actualizarContratoAction}
        casas={casas}
      />
      <InvitarInquilinoDialog
        key={invitando?.id}
        contrato={invitando ?? undefined}
        abierto={invitando !== null}
        onOpenChange={(v) => !v && setInvitando(null)}
      />
    </div>
  );
}

/**
 * Un contrato es el registro más tabular de la app —renta, día de cobro,
 * fianza, vigencia y estado de acceso—, así que se pinta como tabla y no como
 * tarjeta, igual que los movimientos, las facturas o las recurrencias.
 */
function FilaContrato({
  c,
  puedeGestionar,
  onEditar,
  onInvitar,
}: {
  c: ContratoDTO;
  puedeGestionar: boolean;
  onEditar: () => void;
  onInvitar: () => void;
}) {
  const [cerrando, setCerrando] = React.useState(false);
  const [borrando, setBorrando] = React.useState(false);
  const acceso = ACCESO[c.acceso];

  return (
    <TR className={c.activo ? undefined : "opacity-55"}>
      <TD>
        <p className="font-medium">{c.casa.nombre}</p>
        <p className="text-2xs text-faint">
          {[
            !c.activo && "contrato cerrado",
            c.fianza && `fianza ${formatEUR(c.fianza)}`,
            c.tieneRecurrencia && "renta automática",
            c.facturasCompartidas > 0 &&
              `${c.facturasCompartidas} factura${c.facturasCompartidas === 1 ? "" : "s"} compartida${c.facturasCompartidas === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </TD>

      <TD>
        <p className="truncate text-sm">{c.inquilinoNombre}</p>
        <p className="truncate text-2xs text-faint">{c.inquilinoEmail}</p>
      </TD>

      <TD numerico>
        <Money value={c.rentaMensual} tono="ingreso" className="font-medium" />
        <span className="block text-2xs text-faint">día {c.diaCobro}</span>
      </TD>

      <TD className="whitespace-nowrap text-xs text-muted-foreground">
        {formatFecha(c.inicio)}
        {c.fin && (
          <span className="block text-2xs text-faint">
            hasta {formatFecha(c.fin)}
          </span>
        )}
      </TD>

      <TD>
        <Badge variant={acceso.variant}>{acceso.texto}</Badge>
      </TD>

      <TD className="pr-2">
        {puedeGestionar && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Acciones de ${c.casa.nombre}`}
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
                {c.activo && c.acceso !== "ACTIVO" && (
                  <DropdownMenuItem onSelect={onInvitar}>
                    <Link2 />
                    {c.acceso === "INVITADO" ? "Nuevo enlace" : "Dar acceso al portal"}
                  </DropdownMenuItem>
                )}
                {c.acceso === "INVITADO" && c.invitacionId && (
                  <DropdownMenuItem asChild>
                    <form action={revocarAccesoAction}>
                      <input type="hidden" name="id" value={c.invitacionId} />
                      <button type="submit" className="flex w-full items-center gap-2">
                        <XCircle />
                        Revocar invitación
                      </button>
                    </form>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {c.activo && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setTimeout(() => setCerrando(true), 0);
                    }}
                  >
                    <XCircle />
                    Cerrar contrato
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  peligro
                  onSelect={(e) => {
                    e.preventDefault();
                    setTimeout(() => setBorrando(true), 0);
                  }}
                >
                  <Trash2 />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmarAccion
              open={cerrando}
              onOpenChange={setCerrando}
              titulo={`¿Cerrar el contrato de ${c.casa.nombre}?`}
              descripcion="El inquilino perderá el acceso a su panel de inmediato. El contrato se conserva como histórico."
              etiquetaConfirmar="Cerrar contrato"
              onConfirmar={() => {
                const fd = new FormData();
                fd.set("id", c.id);
                void cerrarContratoAction(fd);
              }}
            />
            <ConfirmarAccion
              open={borrando}
              onOpenChange={setBorrando}
              titulo={`¿Eliminar el contrato de ${c.casa.nombre}?`}
              descripcion="Se borra del todo y el inquilino pierde el acceso. Los ingresos ya registrados se conservan."
              onConfirmar={() => {
                const fd = new FormData();
                fd.set("id", c.id);
                void eliminarContratoAction(fd);
              }}
            />
          </>
        )}
      </TD>
    </TR>
  );
}

function ContratoDialog({
  contrato,
  abierto,
  onOpenChange,
  action,
  casas,
}: {
  contrato?: ContratoDTO;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  casas: CasaOpt[];
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [conRenta, setConRenta] = React.useState(true);
  const [conAcceso, setConAcceso] = React.useState(true);

  const cerrar = (v: boolean) => {
    if (!v) setEstado(undefined);
    onOpenChange(v);
  };

  // Con el enlace ya generado el formulario desaparece: lo único que queda es
  // copiarlo y mandárselo al inquilino.
  if (estado?.valor) {
    return (
      <Dialog open={abierto} onOpenChange={cerrar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contrato creado</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Envíale este enlace al inquilino. Con él crea su cuenta y entra a
              un panel donde solo ve su vivienda. Caduca en 7 días y no se puede
              volver a ver: si lo pierdes, genera otro desde la ficha.
            </p>
            <EnlaceCopiable enlace={estado.valor} etiqueta="Enlace de acceso al portal" />
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button size="sm" onClick={() => cerrar(false)}>
              Hecho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {contrato ? "Editar contrato" : "Nuevo contrato de alquiler"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            const res = await action(estado, fd);
            setEstado(res);
            // Si trae enlace, el diálogo se queda para enseñarlo.
            if (res?.ok && !res.valor) onOpenChange(false);
          }}
        >
          {contrato && <input type="hidden" name="id" value={contrato.id} />}
          {!contrato && conRenta && (
            <input type="hidden" name="crearRecurrencia" value="on" />
          )}
          {!contrato && conAcceso && <input type="hidden" name="invitar" value="on" />}

          <DialogBody className="space-y-3">
            <Field label="Casa" error={estado?.errors?.casaId}>
              <Select name="casaId" defaultValue={contrato?.casa.id ?? ""} required>
                <option value="">Elige una casa</option>
                {casas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inquilino" error={estado?.errors?.inquilinoNombre}>
                <Input
                  name="inquilinoNombre"
                  defaultValue={contrato?.inquilinoNombre}
                  required
                />
              </Field>
              <Field
                label="Su email"
                error={estado?.errors?.inquilinoEmail}
                ayuda="Con él entrará a su panel."
              >
                <Input
                  name="inquilinoEmail"
                  type="email"
                  defaultValue={contrato?.inquilinoEmail}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Renta mensual" error={estado?.errors?.rentaMensual}>
                <Input
                  name="rentaMensual"
                  inputMode="decimal"
                  adornoDer="€"
                  defaultValue={contrato?.rentaMensual}
                  required
                />
              </Field>
              <Field label="Fianza" opcional>
                <Input
                  name="fianza"
                  inputMode="decimal"
                  adornoDer="€"
                  defaultValue={contrato?.fianza ?? ""}
                />
              </Field>
              <Field label="Día de cobro" error={estado?.errors?.diaCobro}>
                <Input
                  type="number"
                  name="diaCobro"
                  min={1}
                  max={31}
                  defaultValue={contrato?.diaCobro ?? 1}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio" error={estado?.errors?.inicio}>
                <Input
                  type="date"
                  name="inicio"
                  defaultValue={toDateInputValue(contrato?.inicio ?? new Date())}
                  required
                />
              </Field>
              <Field label="Fin" opcional error={estado?.errors?.fin}>
                <Input
                  type="date"
                  name="fin"
                  defaultValue={contrato?.fin ? toDateInputValue(contrato.fin) : ""}
                />
              </Field>
            </div>

            <Field label="Notas" opcional>
              <Input name="notas" defaultValue={contrato?.notas ?? ""} />
            </Field>

            {!contrato && (
              <div className="space-y-2.5 rounded-md border border-border p-3">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={conRenta}
                    onCheckedChange={setConRenta}
                    aria-label="Cobrar la renta automáticamente"
                  />
                  <span className="text-xs text-muted-foreground">
                    Cobrar la renta automáticamente cada mes.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Switch
                    checked={conAcceso}
                    onCheckedChange={setConAcceso}
                    aria-label="Dar acceso al inquilino"
                  />
                  <span className="text-xs text-muted-foreground">
                    Generar el enlace para que el inquilino vea su panel.
                  </span>
                </div>
              </div>
            )}

            {estado?.message && <FormError>{estado.message}</FormError>}
          </DialogBody>

          <DialogFooter className="justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => cerrar(false)}
            >
              Cancelar
            </Button>
            <SubmitButton size="sm">
              {contrato ? "Guardar cambios" : "Crear contrato"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Genera el enlace de acceso al portal para el inquilino del contrato. */
function InvitarInquilinoDialog({
  contrato,
  abierto,
  onOpenChange,
}: {
  contrato?: ContratoDTO;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar acceso al portal</DialogTitle>
        </DialogHeader>

        {estado?.valor ? (
          <>
            <DialogBody className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Envíale este enlace a {contrato?.inquilinoEmail}. Solo verá su
                vivienda: las facturas que le compartas y su contrato. Caduca en
                7 días.
              </p>
              <EnlaceCopiable
                enlace={estado.valor}
                etiqueta="Enlace de acceso al portal"
              />
            </DialogBody>
            <DialogFooter className="justify-end">
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Hecho
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            action={async (fd) => {
              setEstado(await invitarInquilinoAction(estado, fd));
            }}
          >
            <input type="hidden" name="id" value={contrato?.id ?? ""} />
            <DialogBody className="space-y-2">
              <p className="text-sm">
                Se creará un enlace para{" "}
                <strong>{contrato?.inquilinoEmail}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Con él podrá crear su cuenta y ver el panel de{" "}
                {contrato?.casa.nombre}. No tendrá acceso a ningún otro dato de
                la familia.
              </p>
              {estado?.message && <FormError>{estado.message}</FormError>}
            </DialogBody>
            <DialogFooter className="justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <SubmitButton size="sm">
                <Link2 />
                Generar enlace
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
