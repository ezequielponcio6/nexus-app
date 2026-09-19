"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as "light" | "dark"}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!bg-card !text-card-foreground !border-border !rounded-xl",
        },
      }}
    />
  );
}
