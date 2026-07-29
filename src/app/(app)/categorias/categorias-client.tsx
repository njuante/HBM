"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconoCategoria } from "@/components/ui/icono-categoria";
import { armonizarColor } from "@/components/charts/chart-theme";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
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
import { AparienciaPicker, COLORES } from "@/components/categoria/apariencia-picker";
import type { FormState } from "@/lib/validation/form";
import {
  actualizarCategoriaAction,
  crearCategoriaAction,
  eliminarCategoriaAction,
} from "./actions";

export type CategoriaNodo = {
  id: string;
  nombre: string;
  color: string;
  icono: string | null;
  usos: number;
  subcategorias: Omit<CategoriaNodo, "subcategorias">[];
};

type Tipo = "GASTO" | "INGRESO";
type Item = Omit<CategoriaNodo, "subcategorias">;

type Borrador =
  | { modo: "crear"; tipo: Tipo; parentId?: string; parentNombre?: string }
  | { modo: "editar"; item: Item };

export function CategoriasClient({
  gastos,
  ingresos,
  puedeGestionar,
}: {
  gastos: CategoriaNodo[];
  ingresos: CategoriaNodo[];
  puedeGestionar: boolean;
}) {
  const [tipo, setTipo] = React.useState<Tipo>("GASTO");
  const [borrador, setBorrador] = React.useState<Borrador | null>(null);

  return (
    <>
      <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <TabsList>
            <TabsTrigger value="GASTO">Gastos</TabsTrigger>
            <TabsTrigger value="INGRESO">Ingresos</TabsTrigger>
          </TabsList>
          {puedeGestionar && (
            <Button
              size="sm"
              className="mb-1.5"
              onClick={() => setBorrador({ modo: "crear", tipo })}
            >
              <Plus />
              Nueva categoría
            </Button>
          )}
        </div>

        <TabsContent value="GASTO">
          <Arbol
            lista={gastos}
            puedeGestionar={puedeGestionar}
            onCrear={setBorrador}
            onEditar={setBorrador}
            tipo="GASTO"
          />
        </TabsContent>
        <TabsContent value="INGRESO">
          <Arbol
            lista={ingresos}
            puedeGestionar={puedeGestionar}
            onCrear={setBorrador}
            onEditar={setBorrador}
            tipo="INGRESO"
          />
        </TabsContent>
      </Tabs>

      <CategoriaDialog
        key={
          borrador?.modo === "editar" ? borrador.item.id : `crear-${borrador?.tipo}`
        }
        borrador={borrador}
        raices={(tipo === "GASTO" ? gastos : ingresos).map((c) => ({
          id: c.id,
          nombre: c.nombre,
        }))}
        onOpenChange={(v) => !v && setBorrador(null)}
      />
    </>
  );
}

function Arbol({
  lista,
  puedeGestionar,
  onCrear,
  onEditar,
  tipo,
}: {
  lista: CategoriaNodo[];
  puedeGestionar: boolean;
  onCrear: (b: Borrador) => void;
  onEditar: (b: Borrador) => void;
  tipo: Tipo;
}) {
  if (lista.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Tags}
          titulo="No hay categorías"
          descripcion={`Crea la primera categoría de ${tipo === "GASTO" ? "gasto" : "ingreso"} para poder clasificar los movimientos.`}
          accion={
            puedeGestionar && (
              <Button size="sm" onClick={() => onCrear({ modo: "crear", tipo })}>
                <Plus />
                Nueva categoría
              </Button>
            )
          }
        />
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {lista.map((cat) => (
        <div key={cat.id}>
          <Linea
            item={cat}
            puedeGestionar={puedeGestionar}
            onEditar={() => onEditar({ modo: "editar", item: cat })}
            onAnadirHija={() =>
              onCrear({
                modo: "crear",
                tipo,
                parentId: cat.id,
                parentNombre: cat.nombre,
              })
            }
          />
          {cat.subcategorias.map((sub) => (
            <Linea
              key={sub.id}
              item={sub}
              sangrado
              puedeGestionar={puedeGestionar}
              onEditar={() => onEditar({ modo: "editar", item: sub })}
            />
          ))}
        </div>
      ))}
    </Card>
  );
}

function Linea({
  item,
  sangrado,
  puedeGestionar,
  onEditar,
  onAnadirHija,
}: {
  item: Item;
  sangrado?: boolean;
  puedeGestionar: boolean;
  onEditar: () => void;
  onAnadirHija?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [confirmando, setConfirmando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const color = armonizarColor(item.color, resolvedTheme);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40",
        // El sangrado y el filete son el árbol: no hace falta un icono de rama.
        sangrado && "border-l-2 border-border pl-9",
      )}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
      >
        <IconoCategoria nombre={item.icono} className="size-3.5" color={color} />
      </span>

      <span className={cn("min-w-0 flex-1 truncate", sangrado ? "text-sm" : "font-medium")}>
        {item.nombre}
      </span>

      {error && <span className="text-2xs text-danger">{error}</span>}

      <span className="shrink-0 text-2xs tabular-nums text-faint">
        {item.usos} mov.
      </span>

      {puedeGestionar && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Acciones de ${item.nombre}`}
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
            {onAnadirHija && (
              <DropdownMenuItem onSelect={onAnadirHija}>
                <Plus />
                Añadir subcategoría
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
      )}

      <ConfirmarAccion
        open={confirmando}
        onOpenChange={setConfirmando}
        titulo={`¿Eliminar «${item.nombre}»?`}
        descripcion={
          item.usos > 0
            ? `Tiene ${item.usos} movimientos asociados; habrá que reasignarlos antes de poder borrarla.`
            : "Se borrará esta categoría de forma permanente."
        }
        onConfirmar={async () => {
          const fd = new FormData();
          fd.set("id", item.id);
          const res = await eliminarCategoriaAction(undefined, fd);
          // El servidor bloquea el borrado si hay usos: se muestra en la fila.
          if (res?.message) setError(res.message);
        }}
      />
    </div>
  );
}

function CategoriaDialog({
  borrador,
  raices,
  onOpenChange,
}: {
  borrador: Borrador | null;
  raices: { id: string; nombre: string }[];
  onOpenChange: (v: boolean) => void;
}) {
  const editando = borrador?.modo === "editar";
  const item = editando ? borrador.item : undefined;

  const [estado, setEstado] = React.useState<FormState>(undefined);
  const [apariencia, setApariencia] = React.useState({
    color: item?.color ?? COLORES[0],
    icono: item?.icono ?? null,
  });

  const action = editando ? actualizarCategoriaAction : crearCategoriaAction;

  return (
    <Dialog open={borrador !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando
              ? "Editar categoría"
              : borrador?.modo === "crear" && borrador.parentNombre
                ? `Subcategoría de ${borrador.parentNombre}`
                : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            const res = await action(estado, fd);
            setEstado(res);
            if (res?.ok) onOpenChange(false);
          }}
        >
          {item && <input type="hidden" name="id" value={item.id} />}
          {borrador?.modo === "crear" && (
            <>
              <input type="hidden" name="tipo" value={borrador.tipo} />
              {borrador.parentId && (
                <input type="hidden" name="parentId" value={borrador.parentId} />
              )}
            </>
          )}

          <DialogBody className="space-y-3">
            <div className="flex items-end gap-2">
              <Field
                label="Nombre"
                error={estado?.errors?.nombre}
                className="flex-1"
              >
                <Input
                  name="nombre"
                  defaultValue={item?.nombre}
                  placeholder="Suministros"
                  autoFocus
                  required
                />
              </Field>
              <div className="pb-px">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Aspecto
                </p>
                <AparienciaPicker
                  color={apariencia.color}
                  icono={apariencia.icono}
                  onChange={setApariencia}
                />
              </div>
            </div>

            {borrador?.modo === "crear" && !borrador.parentId && raices.length > 0 && (
              <Field label="Subcategoría de" opcional>
                <Select name="parentId" defaultValue="">
                  <option value="">Es una categoría principal</option>
                  {raices.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

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
              {editando ? "Guardar cambios" : "Crear categoría"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
