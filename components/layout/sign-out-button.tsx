"use client";

import { signOut } from "@/actions/auth";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors px-3.5",
          className
        )}
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </form>
  );
}
