// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { alertasFacturas } from "@/server/db/facturas";

const S = `alr_${Date.now()}`;
let fam: string;

function enDias(dias: number): Date {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}

async function crearFactura(
  familiaId: string,
  estado: "PENDIENTE" | "PAGADA",
  venc: Date | null,
  emisor: string,
) {
  await prisma.factura.create({
    data: {
      familiaId,
      emisor,
      estadoPago: estado,
      fechaVencimiento: venc,
      archivoPath: `x/${S}-${emisor}.pdf`,
      archivoNombre: "f.pdf",
      archivoTipo: "PDF",
    },
  });
}

beforeAll(async () => {
  fam = (await prisma.familia.create({ data: { nombre: `F_${S}` } })).id;
  await crearFactura(fam, "PENDIENTE", enDias(-3), "Vencida");
  await crearFactura(fam, "PENDIENTE", enDias(2), "Proxima");
  await crearFactura(fam, "PENDIENTE", enDias(30), "Futura");
  await crearFactura(fam, "PAGADA", enDias(-5), "Pagada");
  await crearFactura(fam, "PENDIENTE", null, "SinVencimiento");
});

afterAll(async () => {
  await prisma.familia.deleteMany({ where: { id: fam } });
});

describe("alertas de facturas", () => {
  it("clasifica vencidas y próximas, ignora futuras/pagadas/sin vencimiento", async () => {
    const { vencidas, proximas } = await alertasFacturas(fam, 7);
    expect(vencidas.map((v) => v.emisor)).toEqual(["Vencida"]);
    expect(proximas.map((p) => p.emisor)).toEqual(["Proxima"]);
    expect(vencidas[0].diasRestantes).toBeLessThan(0);
    expect(proximas[0].diasRestantes).toBeGreaterThanOrEqual(0);
  });

  it("otra familia no recibe alertas (aislamiento)", async () => {
    const otra = await prisma.familia.create({ data: { nombre: `O_${S}` } });
    const { vencidas, proximas } = await alertasFacturas(otra.id, 7);
    expect(vencidas.length).toBe(0);
    expect(proximas.length).toBe(0);
    await prisma.familia.delete({ where: { id: otra.id } });
  });
});
