-- CreateTable
CREATE TABLE "Invitacion" (
    "id" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'MEMBER',
    "casaId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "aceptadaAt" TIMESTAMP(3),
    "creadaPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_tokenHash_key" ON "Invitacion"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitacion_familiaId_idx" ON "Invitacion"("familiaId");

-- CreateIndex
CREATE INDEX "Invitacion_email_idx" ON "Invitacion"("email");

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_creadaPor_fkey" FOREIGN KEY ("creadaPor") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
