import "server-only";

// Abstracción de almacenamiento de archivos. La implementación local guarda en
// UPLOADS_DIR; en el futuro se puede añadir S3 / Oracle Object Storage sin tocar
// los módulos que la usan.
export interface FileStorage {
  /** Guarda el contenido y devuelve la ruta relativa dentro del almacén. */
  save(relPath: string, data: Buffer): Promise<void>;
  /** Lee el contenido de una ruta relativa. */
  read(relPath: string): Promise<Buffer>;
  /** Elimina el archivo (no falla si no existe). */
  remove(relPath: string): Promise<void>;
}

export { localStorage as fileStorage } from "./local";
