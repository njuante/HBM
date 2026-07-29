-- CreateEnum
CREATE TYPE "Frecuencia" AS ENUM ('SEMANAL', 'MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('GASTO', 'INGRESO');

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "recurrenciaId" TEXT;

-- AlterTable
ALTER TABLE "Ingreso" ADD COLUMN     "recurrenciaId" TEXT;

-- CreateTable
CREATE TABLE "Recurrencia" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "casaId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "subcategoriaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "contraparte" TEXT,
    "metodoPago" "MetodoPago",
    "frecuencia" "Frecuencia" NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "diaMes" INTEGER,
    "proximaFecha" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "automatica" BOOLEAN NOT NULL DEFAULT true,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoPropuesto" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "recurrenciaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "descartadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoPropuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recurrencia_familiaId_proximaFecha_idx" ON "Recurrencia"("familiaId", "proximaFecha");

-- CreateIndex
CREATE INDEX "MovimientoPropuesto_familiaId_idx" ON "MovimientoPropuesto"("familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoPropuesto_recurrenciaId_fecha_key" ON "MovimientoPropuesto"("recurrenciaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Gasto_recurrenciaId_fecha_key" ON "Gasto"("recurrenciaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Ingreso_recurrenciaId_fecha_key" ON "Ingreso"("recurrenciaId", "fecha");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_recurrenciaId_fkey" FOREIGN KEY ("recurrenciaId") REFERENCES "Recurrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_recurrenciaId_fkey" FOREIGN KEY ("recurrenciaId") REFERENCES "Recurrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrencia" ADD CONSTRAINT "Recurrencia_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrencia" ADD CONSTRAINT "Recurrencia_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrencia" ADD CONSTRAINT "Recurrencia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrencia" ADD CONSTRAINT "Recurrencia_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurrencia" ADD CONSTRAINT "Recurrencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPropuesto" ADD CONSTRAINT "MovimientoPropuesto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPropuesto" ADD CONSTRAINT "MovimientoPropuesto_recurrenciaId_fkey" FOREIGN KEY ("recurrenciaId") REFERENCES "Recurrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
