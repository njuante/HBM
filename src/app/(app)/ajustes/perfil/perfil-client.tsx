"use client";

import * as React from "react";
import { useActionState } from "react";
import { Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatFecha } from "@/lib/format";
import type { SesionDTO } from "@/server/db/usuarios";
import {
  actualizarPerfilAction,
  cambiarPasswordAction,
  cerrarSesionAction,
} from "./actions";

export function PerfilClient({
  user,
  sesiones,
}: {
  user: { id: string; nombre: string; email: string };
  sesiones: SesionDTO[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DatosPersonales user={user} />
      <CambioPassword />
      <SesionesActivas sesiones={sesiones} />
    </div>
  );
}

function DatosPersonales({
  user,
}: {
  user: { nombre: string; email: string };
}) {
  const [estado, action] = useActionState(actualizarPerfilAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>
          El nombre es el que ven el resto de miembros de tus familias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <Field label="Nombre" error={estado?.errors?.nombre}>
            <Input name="nombre" defaultValue={user.nombre} required />
          </Field>
          <Field label="Email" error={estado?.errors?.email}>
            <Input
              name="email"
              type="email"
              defaultValue={user.email}
              autoComplete="email"
              required
            />
          </Field>
          {estado?.message && !estado.ok && <FormError>{estado.message}</FormError>}
          {estado?.ok && (
            <p className="text-xs text-success" role="status">
              {estado.message}
            </p>
          )}
          <SubmitButton size="sm">Guardar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function CambioPassword() {
  const [estado, action] = useActionState(cambiarPasswordAction, undefined);
  // Remontar el formulario al acabar limpia los tres campos de golpe.
  const key = estado?.ok ? "hecho" : "editando";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>
          Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form key={key} action={action} className="space-y-3">
          <Field label="Contraseña actual" error={estado?.errors?.actual}>
            <Input
              name="actual"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nueva contraseña" error={estado?.errors?.nueva}>
            <Input
              name="nueva"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Repítela" error={estado?.errors?.repetir}>
            <Input
              name="repetir"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          {estado?.message && !estado.ok && <FormError>{estado.message}</FormError>}
          {estado?.ok && (
            <p className="text-xs text-success" role="status">
              {estado.message}
            </p>
          )}
          <SubmitButton size="sm">Cambiar contraseña</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function SesionesActivas({ sesiones }: { sesiones: SesionDTO[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Sesiones abiertas</CardTitle>
        <CardDescription>
          Cada navegador o dispositivo donde has entrado. Si ves alguna que no
          reconoces, ciérrala y cambia la contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {sesiones.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Monitor className="size-4 shrink-0 text-faint" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">
                  Iniciada el {formatFecha(s.createdAt)}
                </p>
                <p className="text-2xs text-faint">
                  Caduca el {formatFecha(s.expiresAt)}
                </p>
              </div>
              {s.actual ? (
                <Badge variant="primary">Esta sesión</Badge>
              ) : (
                <form action={cerrarSesionAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" size="xs" variant="secondary">
                    Cerrar
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
