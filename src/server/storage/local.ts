import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileStorage } from "./index";

function baseDir(): string {
  const dir = process.env.UPLOADS_DIR || "./uploads";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

// Evita path traversal (../) resolviendo dentro de baseDir.
function resolveSafe(relPath: string): string {
  const base = baseDir();
  const full = path.resolve(base, relPath);
  if (!full.startsWith(path.resolve(base) + path.sep)) {
    throw new Error("Ruta de archivo no permitida.");
  }
  return full;
}

export const localStorage: FileStorage = {
  async save(relPath, data) {
    const full = resolveSafe(relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },
  async read(relPath) {
    return fs.readFile(resolveSafe(relPath));
  },
  async remove(relPath) {
    await fs.rm(resolveSafe(relPath), { force: true });
  },
};
