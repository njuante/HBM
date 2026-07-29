// Nombre de la cookie de sesión. En módulo aparte (sin dependencias de servidor)
// para poder importarlo desde `proxy.ts` sin arrastrar Prisma ni `server-only`.
export const SESSION_COOKIE = "hbm_session";
