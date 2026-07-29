// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileStorage } from "@/server/storage";

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "hbm-uploads-"));
  process.env.UPLOADS_DIR = dir;
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("almacenamiento local", () => {
  it("guarda, lee y elimina un archivo", async () => {
    const rel = "facturas/fam1/test.txt";
    await fileStorage.save(rel, Buffer.from("hola"));
    const leido = await fileStorage.read(rel);
    expect(leido.toString()).toBe("hola");
    await fileStorage.remove(rel);
    await expect(fileStorage.read(rel)).rejects.toBeTruthy();
  });

  it("rechaza rutas con path traversal", async () => {
    await expect(
      fileStorage.save("../fuera.txt", Buffer.from("x")),
    ).rejects.toThrow(/no permitida/i);
  });
});
