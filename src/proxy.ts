import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Chequeo OPTIMISTA: solo mira la presencia de la cookie de sesión.
// La verificación real (BD + familia) la hace la DAL junto a los datos.
// Lista manual y sin comodines: cada ruta nueva se registra aquí.
const RUTAS_PROTEGIDAS = [
  "/dashboard",
  "/casas",
  "/familia",
  "/movimientos",
  "/gastos",
  "/ingresos",
  "/facturas",
  "/ahorro",
  "/categorias",
  "/presupuestos",
  "/recurrentes",
  "/alquileres",
  "/ajustes",
  "/portal",
  "/onboarding",
];
const RUTAS_AUTH = ["/login", "/registro"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const tieneSesion = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const esProtegida = RUTAS_PROTEGIDAS.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  const esAuth = RUTAS_AUTH.includes(pathname);

  if (esProtegida && !tieneSesion) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (esAuth && tieneSesion) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
