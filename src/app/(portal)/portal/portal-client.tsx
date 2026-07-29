"use client";

import { Download, FileText, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { formatEUR } from "@/lib/money";
import type { FacturaPortalDTO } from "@/lib/validation/alquiler";
import { declararPagoAction } from "./actions";

type Contrato = {
  id: string;
  inquilinoNombre: string;
  inicio: string;
  fin: string | null;
  rentaMensual: number;
  fianza: number | null;
  diaCobro: number;
  notas: string | null;
};

export function PortalClient({
  contrato,
  facturas,
}: {
  contrato: Contrato | null;
  facturas: FacturaPortalDTO[];
}) {
  return (
    <div className="space-y-4">
      {contrato && <ResumenContrato c={contrato} />}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="font-serif text-base font-medium tracking-tight">
            Tus facturas
          </h2>
        </div>

        {facturas.length === 0 ? (
          <EmptyState
            icon={FileText}
            titulo="Aún no hay facturas"
            descripcion="Cuando el propietario te comparta una, aparecerá aquí con su importe y su vencimiento."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Factura</TH>
                  <TH className="w-28">Vence</TH>
                  <TH numerico className="w-28">
                    Importe
                  </TH>
                  <TH className="w-32">Estado</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {facturas.map((f) => (
                  <FilaFactura key={f.id} f={f} />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function ResumenContrato({ c }: { c: Contrato }) {
  return (
    <Card className="p-5">
      <h2 className="font-serif text-base font-medium tracking-tight">
        Tu alquiler
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-2xs uppercase tracking-wide text-faint">Renta</dt>
          <dd className="mt-1 font-serif text-lg font-medium">
            {formatEUR(c.rentaMensual)}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-faint">
            Día de cobro
          </dt>
          <dd className="mt-1">Cada día {c.diaCobro}</dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-faint">Fianza</dt>
          <dd className="mt-1">{c.fianza ? formatEUR(c.fianza) : "—"}</dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-wide text-faint">Vigencia</dt>
          <dd className="mt-1 text-xs text-muted-foreground">
            Desde el {formatFecha(c.inicio)}
            {c.fin && ` hasta el ${formatFecha(c.fin)}`}
          </dd>
        </div>
      </dl>

      {c.notas && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {c.notas}
        </p>
      )}
    </Card>
  );
}

function FilaFactura({ f }: { f: FacturaPortalDTO }) {
  const nombre = f.emisor ?? (f.numeroFactura ? `Nº ${f.numeroFactura}` : "Factura");
  const vencida =
    f.estadoPago === "PENDIENTE" &&
    f.fechaVencimiento !== null &&
    new Date(f.fechaVencimiento) < new Date();

  return (
    <TR>
      <TD>
        <p className="font-medium">{nombre}</p>
        {(f.periodo || f.consumo !== null) && (
          <p className="text-2xs text-faint">
            {f.periodo}
            {f.periodo && f.consumo !== null && " · "}
            {f.consumo !== null && `${f.consumo} kWh`}
          </p>
        )}
      </TD>

      <TD className="whitespace-nowrap text-xs text-muted-foreground">
        {f.fechaVencimiento ? formatFecha(f.fechaVencimiento) : "—"}
      </TD>

      <TD numerico className="font-medium">
        {f.importe !== null ? <Money value={f.importe} tono="gasto" /> : "—"}
      </TD>

      <TD>
        {f.estadoPago === "PAGADA" ? (
          <Badge variant="success">Pagada</Badge>
        ) : f.pagoDeclarado ? (
          <Badge variant="warning">Pago avisado</Badge>
        ) : vencida ? (
          <Badge variant="danger">Vencida</Badge>
        ) : (
          <Badge variant="neutral">Pendiente</Badge>
        )}
      </TD>

      <TD className="pr-2">
        <div className="flex items-center justify-end gap-1">
          {f.estadoPago === "PENDIENTE" && !f.pagoDeclarado && (
            <form action={declararPagoAction}>
              <input type="hidden" name="id" value={f.id} />
              <Button type="submit" size="xs" variant="secondary">
                Ya lo he pagado
              </Button>
            </form>
          )}
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={`Descargar ${nombre}`}
          >
            <a href={`/api/facturas/${f.id}/archivo`} target="_blank" rel="noreferrer">
              <Download />
            </a>
          </Button>
        </div>
      </TD>
    </TR>
  );
}
