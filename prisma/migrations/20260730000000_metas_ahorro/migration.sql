-- CreateTable
CREATE TABLE "MetaAhorro" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "concepto" TEXT,
    "objetivoImporte" DECIMAL(12,2) NOT NULL,
    "actualImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaObjetivo" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icono" TEXT NOT NULL DEFAULT 'piggy-bank',
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAhorro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AportacionAhorro" (
    "id" TEXT NOT NULL,
    "metaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AportacionAhorro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaAhorro_familiaId_idx" ON "MetaAhorro"("familiaId");

-- CreateIndex
CREATE INDEX "AportacionAhorro_metaId_idx" ON "AportacionAhorro"("metaId");

-- AddForeignKey
ALTER TABLE "MetaAhorro" ADD CONSTRAINT "MetaAhorro_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AportacionAhorro" ADD CONSTRAINT "AportacionAhorro_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "MetaAhorro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AportacionAhorro" ADD CONSTRAINT "AportacionAhorro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

