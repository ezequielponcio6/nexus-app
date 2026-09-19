"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita mismatch de hidratação: só renderiza o ícone real após montar no client.
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="fixed top-5 right-5 h-10 w-[92px]" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed top-5 right-5 max-[600px]:top-[4.7rem] max-[600px]:right-4 z-10 flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3.5 text-xs font-semibold shadow-sm"
      aria-label="Alternar tema"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
      {isDark ? "Escuro" : "Claro"}
    </button>
  );
}
