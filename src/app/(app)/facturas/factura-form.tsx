"use client";

import * as React from "react";
import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, FormError } from "@/components/ui/field";
import {
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FormState } from "@/lib/validation/form";

export type Opt = { id: string; nombre: string };

export type FacturaDefaults = {
  id?: string;
  emisor?: string | null;
  numeroFactura?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  estadoPago?: string;
  casaId?: string | null;
  gastoId?: string | null;
  consumo?: number | null;
  periodo?: string | null;
};

export function FacturaForm({
  casas,
  gastos,
  action,
  defaults,
  conArchivo = true,
  submitLabel = "Guardar factura",
  onCancel,
  onOk,
}: {
  casas: Opt[];
  gastos: Opt[];
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: FacturaDefaults;
  conArchivo?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onOk?: () => void;
}) {
  const [estado, setEstado] = React.useState<FormState>(undefined);

  return (
    <form
      action={async (fd) => {
        const res = await action(estado, fd);
        setEstado(res);
        if (res?.ok) onOk?.();
      }}
    >
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <DialogBody className="space-y-3">
        {conArchivo && <ZonaArchivo error={estado?.errors?.archivo} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Emisor" opcional>
            <Input
              name="emisor"
              defaultValue={defaults?.emisor ?? ""}
              placeholder="Iberdrola"
            />
          </Field>
          <Field label="Nº de factura" opcional>
            <Input
              name="numeroFactura"
              defaultValue={defaults?.numeroFactura ?? ""}
            />
          </Field>

          <Field label="Fecha de emisión" opcional>
            <Input
              name="fechaEmision"
              type="date"
              defaultValue={defaults?.fechaEmision ?? ""}
            />
          </Field>
          <Field label="Vencimiento" opcional>
            <Input
              name="fechaVencimiento"
              type="date"
              defaultValue={defaults?.fechaVencimiento ?? ""}
            />
          </Field>

          <Field label="Estado">
            <Select
              name="estadoPago"
              defaultValue={defaults?.estadoPago ?? "PENDIENTE"}
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADA">Pagada</option>
            </Select>
          </Field>
          <Field label="Casa" opcional>
            <Select name="casaId" defaultValue={defaults?.casaId ?? ""}>
              <option value="">Sin casa</option>
              {casas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Gasto asociado"
            opcional
            className="sm:col-span-2"
            ayuda="Enlaza la factura con el gasto que ya registraste."
          >
            <Select name="gastoId" defaultValue={defaults?.gastoId ?? ""}>
              <option value="">Sin gasto</option>
              {gastos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Consumo" opcional ayuda="kWh, m³…">
            <Input
              name="consumo"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.consumo ?? ""}
            />
          </Field>
          <Field label="Periodo" opcional>
            <Input
              name="periodo"
              defaultValue={defaults?.periodo ?? ""}
              placeholder="2026-06"
            />
          </Field>
        </div>

        {estado?.message && <FormError>{estado.message}</FormError>}
      </DialogBody>

      <DialogFooter className="justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <SubmitButton size="sm">{submitLabel}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

/**
 * Zona de arrastrar y soltar sobre un `<input type="file">` real: el input
 * sigue ahí (y sigue enviándose con el formulario), solo que invisible.
 */
function ZonaArchivo({ error }: { error?: string[] }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [encima, setEncima] = React.useState(false);

  const asignar = (files: FileList | null) => {
    const f = files?.[0] ?? null;
    if (!f) return;
    // El input es la fuente de verdad para el envío; al soltar hay que
    // trasladarle los ficheros a mano.
    if (inputRef.current && files) inputRef.current.files = files;
    setArchivo(f);
  };

  const Icono = archivo?.type === "application/pdf" ? FileText : ImageIcon;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          asignar(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed transition-colors",
          encima ? "border-primary bg-primary-soft" : "border-input",
          error && "border-danger",
        )}
      >
        <input
          ref={inputRef}
          name="archivo"
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="sr-only"
          id="factura-archivo"
        />

        {archivo ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <Icono className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{archivo.name}</p>
              <p className="text-2xs text-faint">
                {(archivo.size / 1024).toFixed(0)} kB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quitar archivo"
              onClick={() => {
                setArchivo(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X />
            </Button>
          </div>
        ) : (
          <label
            htmlFor="factura-archivo"
            className="flex cursor-pointer flex-col items-center gap-1.5 px-4 py-7 text-center"
          >
            <Upload className="size-4 text-faint" />
            <span className="text-sm text-muted-foreground">
              Arrastra el PDF o la imagen, o{" "}
              <span className="text-primary underline underline-offset-2">
                elige un archivo
              </span>
            </span>
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error[0]}</p>}
    </div>
  );
}
