"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

/**
 * Primitivos "crus" no padrão shadcn/ui oficial — expostos para quem quiser
 * compor um Avatar customizado do zero (ex: dentro de um DropdownMenu).
 */
const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center font-display font-semibold text-white", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// ---------------------------------------------------------------------
// Wrapper de conveniência usado no resto do app: `<Avatar name src size />`.
// Mantém a API antiga (para não precisar tocar em cada call site) mas por
// baixo agora é 100% Radix — carregamento de imagem com fallback real,
// sem flash de imagem quebrada, e semântica de `alt` correta.
// ---------------------------------------------------------------------
function initialsFrom(name: string) {
  const safeName = name || "X";
  return safeName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const GRADIENTS = [
  "from-[#6C63FF] to-[#3F3D9E]",
  "from-[#E8A33D] to-[#B8791F]",
  "from-[#1B998B] to-[#136B61]",
  "from-[#4A5568] to-[#2D3748]",
];

function gradientFor(seed: string) {
  // 🛡️ Proteção crítica: se o seed vier vazio ou indefinido, assume "X" para não quebrar o .split
  const safeSeed = seed || "X";
  const hash = safeSeed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function Avatar({
  src,
  name,
  fallback, // 🛡️ Captura se alguém passar como fallback por engano
  size = 42,
  className,
}: {
  src?: string | null;
  name?: string;
  fallback?: string;
  size?: number;
  className?: string;
}) {
  // 🛡️ Garante que sempre teremos uma string válida para o nome ou apelido
  const safeName = name || fallback || "U";

  return (
    <AvatarRoot className={cn("flex-shrink-0", className)} style={{ width: size, height: size }}>
      {src && <AvatarImage src={src} alt={safeName} />}
      <AvatarFallback
        className={cn("bg-gradient-to-br", gradientFor(safeName))}
        style={{ fontSize: size * 0.36 }}
        delayMs={src ? 400 : 0}
      >
        {initialsFrom(safeName)}
      </AvatarFallback>
    </AvatarRoot>
  );
}

export { AvatarRoot, AvatarImage, AvatarFallback };
