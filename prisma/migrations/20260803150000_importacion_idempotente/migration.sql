-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "huellaImport" TEXT,
ADD COLUMN     "ordenImport" INTEGER;

-- AlterTable
ALTER TABLE "Ingreso" ADD COLUMN     "huellaImport" TEXT,
ADD COLUMN     "ordenImport" INTEGER;

-- CreateIndex
CREATE INDEX "Gasto_familiaId_huellaImport_idx" ON "Gasto"("familiaId", "huellaImport");

-- CreateIndex
CREATE UNIQUE INDEX "Gasto_familiaId_huellaImport_ordenImport_key" ON "Gasto"("familiaId", "huellaImport", "ordenImport");

-- CreateIndex
CREATE INDEX "Ingreso_familiaId_huellaImport_idx" ON "Ingreso"("familiaId", "huellaImport");

-- CreateIndex
CREATE UNIQUE INDEX "Ingreso_familiaId_huellaImport_ordenImport_key" ON "Ingreso"("familiaId", "huellaImport", "ordenImport");

