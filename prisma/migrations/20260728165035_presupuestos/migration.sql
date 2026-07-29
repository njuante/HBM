-- CreateEnum
CREATE TYPE "PeriodoPresupuesto" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "casaId" TEXT,
    "importe" DECIMAL(12,2) NOT NULL,
    "periodo" "PeriodoPresupuesto" NOT NULL DEFAULT 'MENSUAL',
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presupuesto_familiaId_idx" ON "Presupuesto"("familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_familiaId_categoriaId_casaId_periodo_desde_key" ON "Presupuesto"("familiaId", "categoriaId", "casaId", "periodo", "desde");

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
