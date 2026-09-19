import type { Config } from "tailwindcss";

/**
 * TOKENS DE DESIGN — "Nexus"
 * Paleta fugindo do cliché "cream + terracota" / "preto + verde ácido":
 * base grafite-azulado / porcelana, com um dourado abafado como cor de
 * "valor" (liga com moedas/recompensas do criador) e um teal como sinal
 * de status ao vivo/verificado.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",

        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",

        // Dourado abafado — recompensas, wallet, ações de valor
        signal: "hsl(var(--signal))",
        "signal-foreground": "hsl(var(--signal-foreground))",

        // Teal — ao vivo, verificado, sucesso
        live: "hsl(var(--live))",

        destructive: "hsl(var(--destructive))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
