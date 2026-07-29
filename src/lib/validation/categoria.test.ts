import { describe, it, expect } from "vitest";
import { categoriaSchema } from "./categoria";

describe("categoriaSchema", () => {
  it("acepta null en campos opcionales (FormData ausente) y los normaliza", () => {
    // formData.get() devuelve null cuando el campo no existe en el formulario.
    const res = categoriaSchema.safeParse({
      nombre: "Mascotas",
      tipo: "GASTO",
      color: "#4f46e5",
      icono: null,
      parentId: null,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.icono).toBeUndefined();
      expect(res.data.parentId).toBeUndefined();
    }
  });

  it("rechaza colores no hexadecimales", () => {
    const res = categoriaSchema.safeParse({
      nombre: "X",
      tipo: "GASTO",
      color: "rojo",
    });
    expect(res.success).toBe(false);
  });

  it("aplica color por defecto si falta", () => {
    const res = categoriaSchema.safeParse({ nombre: "Test", tipo: "INGRESO" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.color).toBe("#64748b");
  });
});
