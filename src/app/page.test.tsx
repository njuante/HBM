import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "./page";

// La landing lleva el conmutador de tema, que consume el contexto que en la
// app monta `app/layout.tsx`.
function renderLanding() {
  return render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  );
}

describe("Home", () => {
  it("muestra el titular y los enlaces de acceso", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", { level: 1, name: /controla los gastos/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crear cuenta/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });
});
