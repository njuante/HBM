"use client";

import * as React from "react";
import { Check, LogOut, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EnlaceCopiable } from "@/components/ui/enlace-copiable";
import { formatFecha } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Segmented } from "@/components/ui/segmented";
import { SwitchEnvio } from "@/components/ui/switch-envio";
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormState } from "@/lib/validation/form";
import type { InvitacionDTO } from "@/server/db/invitaciones";
import {
  abandonarFamiliaAction,
  invitarAction,
  revocarInvitacionAction,
  cambiarRolAction,
  eliminarMiembroAction,
  renombrarFamiliaAction,
} from "./actions";
import { activarAlquileresAction } from "@/app/(app)/alquileres/actions";

export type Rol = "OWNER" | "ADMIN" | "MEMBER";

export type MiembroDTO = {
  id: string;
  rol: Rol;
  userId: string;
  nombre: string;
  email: string;
};

const ROL_ETIQUETA: Record<Rol, string> = {
  OWNER: "Propietario",
  ADMIN: "Administra",
  MEMBER: "Miembro",
};

const ROL_VARIANT = {
  OWNER: "primary",
  ADMIN: "success",
  MEMBER: "neutral",
} as const;

export function FamiliaClient({
  familiaNombre,
  miembros,
  currentUserId,
  esOwner,
  puedeGestionar,
  invitaciones,
  alquileresActivo,
}: {
  familiaNombre: string;
  miembros: MiembroDTO[];
  currentUserId: string;
  esOwner: boolean;
  puedeGestionar: boolean;
  invitaciones: InvitacionDTO[];
  alquileresActivo: boolean;
}) {
  const [invitando, setInvitando] = React.useState(false);

  return (
    <div>
      <PageHeader
        title="Familia"
        description={`${miembros.length} ${
          miembros.length === 1 ? "persona" : "personas"
        } con acceso`}
        action={
          puedeGestionar && (
            <Button onClick={() => setInvitando(true)}>
              <UserPlus />
              Invitar
            </Button>
          )
        }
      />

      {/* `min-w-0` en las celdas: por defecto una celda de rejilla no baja de
          su contenido mínimo, así que un email largo la ensanchaba y con ella
          la página entera, sin dejar que `truncate` llegara a actuar. */}
      <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
        </CardHeader>

        <CardContent className="px-0 pb-0 pt-2">
          <ul className="divide-y divide-border border-t border-border">
            {miembros.map((m) => (
              <MiembroFila
                key={m.id}
                m={m}
                esYo={m.userId === currentUserId}
                esOwner={esOwner}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        {puedeGestionar && invitaciones.length > 0 && (
          <InvitacionesPendientes invitaciones={invitaciones} />
        )}
        {puedeGestionar && <RenombrarFamilia nombre={familiaNombre} />}

        <Card>
          <CardHeader>
            <CardTitle>Los roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2 text-xs">
            <p>
              <Badge variant="primary">Propietario</Badge>{" "}
              <span className="text-muted-foreground">
                manda: gestiona miembros y roles.
              </span>
            </p>
            <p>
              <Badge variant="success">Administra</Badge>{" "}
              <span className="text-muted-foreground">
                crea y edita casas, categorías y movimientos.
              </span>
            </p>
            <p>
              <Badge>Miembro</Badge>{" "}
              <span className="text-muted-foreground">
                registra sus movimientos y edita los suyos.
              </span>
            </p>
          </CardContent>
        </Card>

        {esOwner && <ModuloAlquileres activo={alquileresActivo} />}

        <SalirDeLaFamilia nombre={familiaNombre} />
      </div>

      </div>

      <InvitarDialog
        abierto={invitando}
        onOpenChange={setInvitando}
        puedeAsignarOwner={esOwner}
      />
    </div>
  );
}

function MiembroFila({
  m,
  esYo,
  esOwner,
}: {
  m: MiembroDTO;
  esYo: boolean;
  esOwner: boolean;
}) {
  const [confirmando, setConfirmando] = React.useState(false);
  const gestionable = esOwner && !esYo;

  const iniciales = m.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <li className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-2xs font-medium",
          esYo
            ? "bg-primary-soft text-primary"
            : "border border-border bg-muted text-muted-foreground",
        )}
      >
        {iniciales}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {m.nombre}
          {esYo && <span className="ml-1.5 text-2xs text-faint">tú</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
      </div>

      {gestionable ? (
        <RolMenu membershipId={m.id} rolActual={m.rol} />
      ) : (
        <Badge variant={ROL_VARIANT[m.rol]}>{ROL_ETIQUETA[m.rol]}</Badge>
      )}

      {gestionable && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Quitar a ${m.nombre}`}
            className="accion-fila"
            onClick={() => setConfirmando(true)}
          >
            <Trash2 />
          </Button>
          <ConfirmarAccion
            open={confirmando}
            onOpenChange={setConfirmando}
            titulo={`¿Quitar a ${m.nombre} de la familia?`}
            descripcion="Perderá el acceso a los datos. Los movimientos que registró se conservan."
            etiquetaConfirmar="Quitar"
            onConfirmar={() => {
              const fd = new FormData();
              fd.set("membershipId", m.id);
              void eliminarMiembroAction(fd);
            }}
          />
        </>
      )}
    </li>
  );
}

function RolMenu({
  membershipId,
  rolActual,
}: {
  membershipId: string;
  rolActual: Rol;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [rol, setRol] = React.useState<Rol>(rolActual);

  return (
    <form ref={formRef} action={cambiarRolAction}>
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="rol" value={rol} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`Cambiar rol (ahora: ${ROL_ETIQUETA[rolActual]})`}
          >
            <Badge variant={ROL_VARIANT[rolActual]}>
              {ROL_ETIQUETA[rolActual]}
              <MoreHorizontal className="size-3" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Rol</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            // Sobre el estado local, no sobre la prop: así el punto salta al
            // pulsar y no espera a que vuelva el servidor.
            value={rol}
            onValueChange={(v) => {
              setRol(v as Rol);
              // El valor del input aún no ha llegado al DOM en este tick.
              setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
          >
            {(Object.keys(ROL_ETIQUETA) as Rol[]).map((r) => (
              <DropdownMenuRadioItem key={r} value={r}>
                {ROL_ETIQUETA[r]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}

function RenombrarFamilia({ nombre }: { nombre: string }) {
  const [estado, setEstado] = React.useState<FormState>(undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nombre</CardTitle>
        </CardHeader>
      <CardContent className="pt-2">
        <form
          action={async (fd) => setEstado(await renombrarFamiliaAction(estado, fd))}
          className="space-y-2"
        >
          <Field label="Nombre de la familia" error={estado?.errors?.nombre}>
            <Input name="nombre" defaultValue={nombre} required />
          </Field>
          <div className="flex items-center gap-2">
            <SubmitButton variant="secondary" size="sm">
              Guardar
            </SubmitButton>
            {estado?.ok && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="size-3" />
                Guardado
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InvitarDialog({
  abierto,
  onOpenChange,
  puedeAsignarOwner,
}: {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  puedeAsignarOwner: boolean;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [rol, setRol] = React.useState<Rol>("MEMBER");

  const roles: { value: Rol; label: string }[] = [
    { value: "MEMBER", label: "Miembro" },
    { value: "ADMIN", label: "Administra" },
    ...(puedeAsignarOwner
      ? [{ value: "OWNER" as Rol, label: "Propietario" }]
      : []),
  ];

  const cerrar = (v: boolean) => {
    if (!v) setEstado(undefined);
    onOpenChange(v);
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a la familia</DialogTitle>
        </DialogHeader>

        {/* Con el enlace ya generado el formulario desaparece: lo único que
            queda por hacer es copiarlo y enviarlo. */}
        {estado?.valor ? (
          <>
            <DialogBody className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Envíale este enlace. Caduca en 7 días y solo sirve para el email
                invitado. No se puede volver a ver: si lo pierdes, revoca la
                invitación y crea otra.
              </p>
              <EnlaceCopiable enlace={estado.valor} />
            </DialogBody>
            <DialogFooter className="justify-end">
              <Button size="sm" onClick={() => cerrar(false)}>
                Hecho
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            action={async (fd) => {
              setEstado(await invitarAction(estado, fd));
            }}
          >
            <input type="hidden" name="rol" value={rol} />

            <DialogBody className="space-y-3">
              <Field
                label="Email"
                error={estado?.errors?.email}
                ayuda="No hace falta que tenga cuenta: podrá crearla desde el enlace."
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="persona@email.com"
                  autoFocus
                  required
                />
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Rol</p>
                <Segmented
                  ariaLabel="Rol"
                  value={rol}
                  onChange={setRol}
                  options={roles}
                />
              </div>

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
                <UserPlus />
                Crear invitación
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Invitaciones creadas y aún sin aceptar. */
function InvitacionesPendientes({
  invitaciones,
}: {
  invitaciones: InvitacionDTO[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
        <CardDescription>Aún no han entrado.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-2">
        <ul className="divide-y divide-border border-t border-border">
          {invitaciones.map((i) => (
            <li key={i.id} className="flex items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{i.email}</p>
                <p className="text-2xs text-faint">
                  {i.caducada
                    ? "Caducada"
                    : `Caduca el ${formatFecha(i.expiresAt)}`}
                </p>
              </div>
              <Badge variant={ROL_VARIANT[i.rol]}>{ROL_ETIQUETA[i.rol]}</Badge>
              <form action={revocarInvitacionAction}>
                <input type="hidden" name="id" value={i.id} />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Revocar la invitación de ${i.email}`}
                >
                  <Trash2 />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Salida voluntaria. Hasta ahora un miembro no podía irse por su cuenta: la
 * única forma era que un propietario lo expulsara.
 */
function SalirDeLaFamilia({ nombre }: { nombre: string }) {
  const [confirmando, setConfirmando] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-danger"
        onClick={() => setConfirmando(true)}
      >
        <LogOut />
        Salir de esta familia
      </Button>

      <ConfirmarAccion
        open={confirmando}
        onOpenChange={setConfirmando}
        titulo={`¿Salir de ${nombre}?`}
        descripcion="Perderás el acceso a sus datos. Los movimientos que registraste se quedan. Si eres el único propietario, primero nombra a otro."
        etiquetaConfirmar="Salir"
        onConfirmar={() => void abandonarFamiliaAction()}
      />
    </>
  );
}

/**
 * Interruptor del módulo de alquileres. Es opcional a propósito: la mayoría de
 * familias no alquila nada, y hasta que se enciende no aparece por ningún lado.
 */
function ModuloAlquileres({ activo }: { activo: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alquileres</CardTitle>
        <CardDescription>Módulo opcional</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <SwitchEnvio
          action={activarAlquileresAction}
          name="activo"
          defaultChecked={activo}
          ariaLabel="Activar el módulo de alquileres"
        >
          <span className="text-xs text-muted-foreground">
            Si alquilas alguna vivienda, actívalo para llevar contratos, cobrar
            la renta y darle a cada inquilino un panel donde ver sus facturas.
          </span>
        </SwitchEnvio>
      </CardContent>
    </Card>
  );
}
