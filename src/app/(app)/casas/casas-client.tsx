"use client";

import * as React from "react";
import { House, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmarAccion } from "@/components/ui/alert-dialog";
import { SwitchEnvio } from "@/components/ui/switch-envio";
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
import type { FormState } from "@/lib/validation/form";
import { actualizarCasaAction, crearCasaAction, eliminarCasaAction } from "./actions";
import { marcarEnAlquilerAction } from "@/app/(app)/alquileres/actions";

export type CasaDTO = {
  id: string;
  nombre: string;
  direccion: string | null;
  enAlquiler: boolean;
  movimientos: number;
};

export function CasasClient({
  casas,
  puedeGestionar,
  alquileresActivo,
}: {
  casas: CasaDTO[];
  puedeGestionar: boolean;
  alquileresActivo: boolean;
}) {
  const [editando, setEditando] = React.useState<CasaDTO | null>(null);
  const [creando, setCreando] = React.useState(false);

  return (
    <>
      {puedeGestionar && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Añadir casa
          </Button>
        </div>
      )}

      {casas.length === 0 ? (
        <Card>
          <EmptyState
            icon={House}
            titulo="Aún no hay casas"
            descripcion="Cada gasto se asigna a una vivienda. Crea la primera para empezar a registrar movimientos."
            accion={
              puedeGestionar && (
                <Button size="sm" onClick={() => setCreando(true)}>
                  <Plus />
                  Añadir casa
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {casas.map((casa) => (
            <Card
              key={casa.id}
              className="flex flex-col p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60">
                  <House className="size-4 text-muted-foreground" />
                </div>
                {puedeGestionar && (
                  <AccionesCasa
                    casa={casa}
                    onEditar={() => setEditando(casa)}
                  />
                )}
              </div>

              <p className="mt-3 truncate font-medium">{casa.nombre}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {casa.direccion || "Sin dirección"}
              </p>
              <p className="mt-3 text-2xs uppercase tracking-wide text-faint">
                {casa.movimientos}{" "}
                {casa.movimientos === 1 ? "movimiento" : "movimientos"}
              </p>

              {alquileresActivo && puedeGestionar && (
                <EnAlquilerSwitch casa={casa} />
              )}
            </Card>
          ))}
        </div>
      )}

      <CasaDialog
        abierto={creando}
        onOpenChange={setCreando}
        action={crearCasaAction}
      />
      <CasaDialog
        key={editando?.id}
        casa={editando ?? undefined}
        abierto={editando !== null}
        onOpenChange={(v) => !v && setEditando(null)}
        action={actualizarCasaAction}
      />
    </>
  );
}

function AccionesCasa({
  casa,
  onEditar,
}: {
  casa: CasaDTO;
  onEditar: () => void;
}) {
  const [confirmando, setConfirmando] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${casa.nombre}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil />
            Editar
          </DropdownMenuItem>
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
        titulo={`¿Eliminar «${casa.nombre}»?`}
        descripcion={
          casa.movimientos > 0
            ? `Se borrarán también sus ${casa.movimientos} movimientos y las facturas asociadas. No se puede deshacer.`
            : "Se borrará esta casa de forma permanente."
        }
        onConfirmar={() => {
          const fd = new FormData();
          fd.set("id", casa.id);
          void eliminarCasaAction(fd);
        }}
      />
    </>
  );
}

function CasaDialog({
  casa,
  abierto,
  onOpenChange,
  action,
}: {
  casa?: CasaDTO;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{casa ? "Editar casa" : "Nueva casa"}</DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            const res = await action(estado, fd);
            setEstado(res);
            if (res?.ok) onOpenChange(false);
          }}
        >
          {casa && <input type="hidden" name="id" value={casa.id} />}

          <DialogBody className="space-y-3">
            <Field label="Nombre" error={estado?.errors?.nombre}>
              <Input
                name="nombre"
                defaultValue={casa?.nombre}
                placeholder="Piso Madrid"
                autoFocus
                required
              />
            </Field>
            <Field label="Dirección" opcional>
              <Input
                name="direccion"
                defaultValue={casa?.direccion ?? ""}
                placeholder="Calle Mayor 1, Madrid"
              />
            </Field>
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
              {casa ? "Guardar cambios" : "Crear casa"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Marca la vivienda como alquilada. Es la puerta del módulo: solo una casa
 * marcada puede tener contrato y recibir facturas compartidas.
 */
function EnAlquilerSwitch({ casa }: { casa: CasaDTO }) {
  return (
    <SwitchEnvio
      action={marcarEnAlquilerAction}
      name="enAlquiler"
      defaultChecked={casa.enAlquiler}
      ariaLabel={`Marcar ${casa.nombre} como alquilada`}
      campos={{ id: casa.id }}
      className="mt-3 border-t border-border pt-3"
    >
      <span className="text-xs text-muted-foreground">En alquiler</span>
    </SwitchEnvio>
  );
}
