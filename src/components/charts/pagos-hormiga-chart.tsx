"use client";

import React from "react";
import { Bug, TrendingUp, Sparkles } from "lucide-react";
import { formatEUR } from "@/lib/money";
import type { ResumenPagosHormiga } from "@/server/db/pagos-hormiga";
import { ChartFrame } from "./chart-frame";

export function PagosHormigaChart({ data }: { data: ResumenPagosHormiga }) {
  return (
    <div className="space-y-4">
      {/* TARJETAS DE IMPACTO HORMIJA */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-2xs font-semibold text-amber-500 uppercase tracking-wider">
            <span>Pagos Hormiga este Mes</span>
            <Bug className="size-4" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-foreground">
            {formatEUR(data.totalMes)}
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            Representan el <strong className="text-amber-500">{data.porcentajeGastoTotal}%</strong> de tus gastos totales
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Impacto Anual Proyectado</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-primary">
            {formatEUR(data.proyeccionAnual)} /año
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            Cálculo estimado si mantienes este ritmo de micro-compras
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Nº de Micro-Compras</span>
            <Sparkles className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-serif text-2xl font-semibold text-foreground">
            {data.cantidadMovimientos} <span className="text-sm font-sans font-normal text-muted-foreground">operaciones</span>
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            Cargos individuales ≤ {data.umbralLimite} €
          </p>
        </div>
      </div>

      {/* DESGLOSE POR CATEGORÍA Y TOP CONCEPTOS */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* CATEGORÍAS */}
        <ChartFrame
          titulo="¿Dónde se escapan los Pagos Hormiga?"
          subtitulo="Distribución de micro-gastos por categoría"
          descripcion="Distribución por categorías de micro-compras desapercibidas"
        >
          <div className="p-3 space-y-3">
            {data.categorias.length > 0 ? (
              data.categorias.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.nombre}
                    </span>
                    <span className="font-mono text-2xs">
                      <strong>{formatEUR(cat.total)}</strong> ({cat.porcentaje}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${cat.porcentaje}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No se detectaron micro-gastos este mes. ¡Buen trabajo!
              </div>
            )}
          </div>
        </ChartFrame>

        {/* TOP CONCEPTOS FRECUENTES */}
        <ChartFrame
          titulo="Pagos Hormiga Más Frecuentes"
          subtitulo="Micro-compras repetidas que puedes controlar"
          descripcion="Lista de los conceptos de micro-compras más frecuentes del mes"
        >
          <div className="p-2 divide-y divide-border">
            {data.topConceptos.length > 0 ? (
              data.topConceptos.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/30 rounded transition-colors text-xs">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-medium text-foreground truncate">{c.concepto}</p>
                    <p className="text-2xs text-muted-foreground">
                      {c.veces} {c.veces === 1 ? "vez" : "veces"} · Promedio: {formatEUR(c.promedio)}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-amber-500 whitespace-nowrap">
                    {formatEUR(c.total)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Sin registros repetidos de pequeños cargos.
              </div>
            )}
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}
