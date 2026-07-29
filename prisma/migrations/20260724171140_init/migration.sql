-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('GASTO', 'INGRESO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'DOMICILIACION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateEnum
CREATE TYPE "TipoArchivo" AS ENUM ('PDF', 'IMAGEN');

-- CreateEnum
CREATE TYPE "OcrEstado" AS ENUM ('NO_PROCESADO', 'PENDIENTE', 'PROCESADO', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casa" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icono" TEXT,
    "parentId" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "subcategoriaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "emisor" TEXT,
    "metodoPago" "MetodoPago",
    "recurrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingreso" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "casaId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "fuente" TEXT,
    "recurrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "casaId" TEXT,
    "gastoId" TEXT,
    "emisor" TEXT,
    "numeroFactura" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "archivoPath" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "archivoTipo" "TipoArchivo" NOT NULL,
    "datosExtra" JSONB,
    "ocrEstado" "OcrEstado" NOT NULL DEFAULT 'NO_PROCESADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Membership_familiaId_idx" ON "Membership"("familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_familiaId_key" ON "Membership"("userId", "familiaId");

-- CreateIndex
CREATE INDEX "Casa_familiaId_idx" ON "Casa"("familiaId");

-- CreateIndex
CREATE INDEX "Categoria_familiaId_idx" ON "Categoria"("familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_familiaId_tipo_parentId_nombre_key" ON "Categoria"("familiaId", "tipo", "parentId", "nombre");

-- CreateIndex
CREATE INDEX "Gasto_familiaId_fecha_idx" ON "Gasto"("familiaId", "fecha");

-- CreateIndex
CREATE INDEX "Gasto_casaId_idx" ON "Gasto"("casaId");

-- CreateIndex
CREATE INDEX "Gasto_categoriaId_idx" ON "Gasto"("categoriaId");

-- CreateIndex
CREATE INDEX "Ingreso_familiaId_fecha_idx" ON "Ingreso"("familiaId", "fecha");

-- CreateIndex
CREATE INDEX "Ingreso_casaId_idx" ON "Ingreso"("casaId");

-- CreateIndex
CREATE INDEX "Ingreso_categoriaId_idx" ON "Ingreso"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_gastoId_key" ON "Factura"("gastoId");

-- CreateIndex
CREATE INDEX "Factura_familiaId_idx" ON "Factura"("familiaId");

-- CreateIndex
CREATE INDEX "Factura_estadoPago_idx" ON "Factura"("estadoPago");

-- CreateIndex
CREATE INDEX "Factura_fechaVencimiento_idx" ON "Factura"("fechaVencimiento");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casa" ADD CONSTRAINT "Casa_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
