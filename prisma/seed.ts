import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seed independiente (se ejecuta con tsx, fuera de Next): instancia su propio
// cliente Prisma en vez de importar el singleton de la app (que usa `server-only`).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mismos colores e iconos que `src/server/db/categorias-default.ts`.
const CATEGORIAS_GASTO = [
  { nombre: "Vivienda", color: "#4c4a7c", icono: "house" },
  {
    nombre: "Suministros",
    color: "#26606b",
    icono: "plug",
    hijos: [
      { nombre: "Luz", color: "#86691e", icono: "zap" },
      { nombre: "Agua", color: "#3d7f8c", icono: "droplet" },
      { nombre: "Gas", color: "#a33b28", icono: "flame" },
      { nombre: "Internet", color: "#155661", icono: "wifi" },
    ],
  },
  { nombre: "Alimentación", color: "#4a6b3d", icono: "shopping-cart" },
  { nombre: "Transporte", color: "#a85b22", icono: "car" },
  { nombre: "Ocio", color: "#2f7a5e", icono: "party-popper" },
];
const CATEGORIAS_INGRESO = [
  { nombre: "Nómina", color: "#4a6b3d", icono: "wallet" },
  { nombre: "Alquiler", color: "#26606b", icono: "key" },
];

async function main() {
  const email = "demo@hbm.local";

  // Borrado en orden: `Gasto.usuarioId` es RESTRICT, así que hay que vaciar
  // los movimientos de sus familias antes de tocar al usuario.
  const previo = await prisma.user.findUnique({
    where: { email },
    select: { id: true, memberships: { select: { familiaId: true } } },
  });
  if (previo) {
    const familiaIds = previo.memberships.map((m) => m.familiaId);
    const enFamilias = { familiaId: { in: familiaIds } };
    await prisma.contratoAlquiler.deleteMany({ where: enFamilias });
    await prisma.factura.deleteMany({ where: enFamilias });
    await prisma.presupuesto.deleteMany({ where: enFamilias });
    await prisma.movimientoPropuesto.deleteMany({ where: enFamilias });
    await prisma.gasto.deleteMany({ where: enFamilias });
    await prisma.ingreso.deleteMany({ where: enFamilias });
    await prisma.categoria.deleteMany({ where: enFamilias });
    await prisma.casa.deleteMany({ where: enFamilias });
    await prisma.session.deleteMany({ where: { userId: previo.id } });
    await prisma.membership.deleteMany({ where: { userId: previo.id } });
    await prisma.familia.deleteMany({ where: { id: { in: familiaIds } } });
    await prisma.user.delete({ where: { id: previo.id } });
  }

  const passwordHash = await bcrypt.hash("Demo1234", 10);
  const user = await prisma.user.create({ data: { nombre: "Demo", email, passwordHash } });
  const familia = await prisma.familia.create({ data: { nombre: "Familia Demo" } });
  await prisma.membership.create({
    data: { userId: user.id, familiaId: familia.id, rol: "OWNER" },
  });
  const casa = await prisma.casa.create({
    data: { familiaId: familia.id, nombre: "Piso Centro", direccion: "Calle Mayor 1" },
  });

  const catGasto: Record<string, string> = {};
  for (const c of CATEGORIAS_GASTO) {
    const parent = await prisma.categoria.create({
      data: {
        familiaId: familia.id,
        tipo: "GASTO",
        nombre: c.nombre,
        color: c.color,
        icono: c.icono,
      },
    });
    catGasto[c.nombre] = parent.id;
    for (const h of c.hijos ?? []) {
      await prisma.categoria.create({
        data: {
          familiaId: familia.id,
          tipo: "GASTO",
          nombre: h.nombre,
          color: h.color,
          icono: h.icono,
          parentId: parent.id,
        },
      });
    }
  }
  const catIngreso: Record<string, string> = {};
  for (const c of CATEGORIAS_INGRESO) {
    const cat = await prisma.categoria.create({
      data: {
        familiaId: familia.id,
        tipo: "INGRESO",
        nombre: c.nombre,
        color: c.color,
        icono: c.icono,
      },
    });
    catIngreso[c.nombre] = cat.id;
  }

  const hoy = new Date();
  const mes = (m: number, d: number) => new Date(hoy.getFullYear(), hoy.getMonth() - m, d);

  await prisma.gasto.createMany({
    data: [
      { familiaId: familia.id, casaId: casa.id, categoriaId: catGasto["Alimentación"], usuarioId: user.id, importe: "245.60", fecha: mes(0, 5), concepto: "Compra mensual" },
      { familiaId: familia.id, casaId: casa.id, categoriaId: catGasto["Suministros"], usuarioId: user.id, importe: "78.30", fecha: mes(0, 10), concepto: "Factura luz", emisor: "Iberdrola" },
      { familiaId: familia.id, casaId: casa.id, categoriaId: catGasto["Transporte"], usuarioId: user.id, importe: "60.00", fecha: mes(1, 12), concepto: "Gasolina" },
      { familiaId: familia.id, casaId: casa.id, categoriaId: catGasto["Ocio"], usuarioId: user.id, importe: "42.00", fecha: mes(1, 20), concepto: "Cine y cena" },
      { familiaId: familia.id, casaId: casa.id, categoriaId: catGasto["Vivienda"], usuarioId: user.id, importe: "650.00", fecha: mes(2, 1), concepto: "Alquiler", recurrente: true },
    ],
  });
  await prisma.ingreso.createMany({
    data: [
      { familiaId: familia.id, casaId: casa.id, categoriaId: catIngreso["Nómina"], usuarioId: user.id, importe: "1800.00", fecha: mes(0, 1), concepto: "Nómina", recurrente: true },
      { familiaId: familia.id, casaId: casa.id, categoriaId: catIngreso["Nómina"], usuarioId: user.id, importe: "1800.00", fecha: mes(1, 1), concepto: "Nómina", recurrente: true },
    ],
  });

  // Presupuestos: uno holgado, uno al filo y el global de la familia. Sirven
  // para ver de un vistazo los tres estados de la barra.
  const inicioAno = new Date(hoy.getFullYear(), 0, 1);
  await prisma.presupuesto.createMany({
    data: [
      { familiaId: familia.id, categoriaId: catGasto["Alimentación"], importe: "300.00", periodo: "MENSUAL", desde: inicioAno },
      { familiaId: familia.id, categoriaId: catGasto["Suministros"], importe: "80.00", periodo: "MENSUAL", desde: inicioAno },
      { familiaId: familia.id, importe: "1500.00", periodo: "MENSUAL", desde: inicioAno },
    ],
  });

  // Recurrencias: el alquiler se genera solo, el gimnasio pide confirmación.
  const proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  await prisma.recurrencia.createMany({
    data: [
      {
        familiaId: familia.id, tipo: "GASTO", casaId: casa.id,
        categoriaId: catGasto["Vivienda"], usuarioId: user.id,
        importe: "650.00", concepto: "Alquiler", contraparte: "Inmobiliaria",
        frecuencia: "MENSUAL", diaMes: 1, proximaFecha: proximo, automatica: true,
      },
      {
        familiaId: familia.id, tipo: "INGRESO", casaId: casa.id,
        categoriaId: catIngreso["Nómina"], usuarioId: user.id,
        importe: "1800.00", concepto: "Nómina", contraparte: "Empresa",
        frecuencia: "MENSUAL", diaMes: 1, proximaFecha: proximo, automatica: true,
      },
      {
        familiaId: familia.id, tipo: "GASTO", casaId: casa.id,
        categoriaId: catGasto["Ocio"], usuarioId: user.id,
        importe: "39.90", concepto: "Gimnasio",
        frecuencia: "MENSUAL", diaMes: 5, proximaFecha: proximo, automatica: false,
      },
    ],
  });

  // Alquiler de ejemplo: segunda casa, módulo encendido y contrato vivo. El
  // inquilino se invita desde la app (el enlace no se puede sembrar: el token
  // solo existe al crearlo).
  await prisma.familia.update({
    where: { id: familia.id },
    data: { alquileresActivo: true },
  });
  const casaAlquilada = await prisma.casa.create({
    data: {
      familiaId: familia.id,
      nombre: "Ático Norte",
      direccion: "Avenida del Parque 12",
      enAlquiler: true,
    },
  });
  await prisma.contratoAlquiler.create({
    data: {
      familiaId: familia.id,
      casaId: casaAlquilada.id,
      inquilinoNombre: "Marta Ruiz",
      inquilinoEmail: "marta@example.com",
      inicio: new Date(hoy.getFullYear(), 0, 1),
      rentaMensual: "780.00",
      fianza: "1560.00",
      diaCobro: 3,
    },
  });

  console.log("Seed completado. Usuario: demo@hbm.local / Demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
