-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'INQUILINO';

-- AlterTable
ALTER TABLE "Casa" ADD COLUMN     "enAlquiler" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Factura" ADD COLUMN     "compartidaAt" TIMESTAMP(3),
ADD COLUMN     "pagoDeclaradoAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Familia" ADD COLUMN     "alquileresActivo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "casaId" TEXT;

-- CreateTable
CREATE TABLE "ContratoAlquiler" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "inquilinoNombre" TEXT NOT NULL,
    "inquilinoEmail" TEXT NOT NULL,
    "inquilinoUserId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "rentaMensual" DECIMAL(12,2) NOT NULL,
    "fianza" DECIMAL(12,2),
    "diaCobro" INTEGER NOT NULL DEFAULT 1,
    "recurrenciaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoAlquiler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContratoAlquiler_recurrenciaId_key" ON "ContratoAlquiler"("recurrenciaId");

-- CreateIndex
CREATE INDEX "ContratoAlquiler_familiaId_casaId_idx" ON "ContratoAlquiler"("familiaId", "casaId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoAlquiler" ADD CONSTRAINT "ContratoAlquiler_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoAlquiler" ADD CONSTRAINT "ContratoAlquiler_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoAlquiler" ADD CONSTRAINT "ContratoAlquiler_recurrenciaId_fkey" FOREIGN KEY ("recurrenciaId") REFERENCES "Recurrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
