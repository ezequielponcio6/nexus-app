"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, SquarePlus, User, Settings, Wallet } from "lucide-react";
import { SignOutButton } from "./sign-out-button"; 
import { ThemeToggle } from "./theme-toggle";   
import { createClient } from "@/lib/supabase/client"; // Importa o cliente do supabase para checar a sessão

interface AppShellProps {
  children: React.ReactNode;
  user: any;
}

export function AppShell({ children, user: initialUser }: AppShellProps) {
  const activePath = usePathname() || "";
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Busca o usuário logado diretamente se ele não tiver vindo por propriedade
  useEffect(() => {
    if (!currentUser) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      });
    }
  }, [currentUser]);

  // Se não encontrar o usuário logado de jeito nenhum, joga para "convidado" em vez de "feed"
  let usernameFallback = "convidado";

  if (currentUser?.user_metadata?.username) {
    usernameFallback = currentUser.user_metadata.username;
  } else if (currentUser?.email) {
    const parts = currentUser.email.split("@");
    if (parts && parts.length > 0) {
      usernameFallback = parts[0];
    }
  }

  const NAV_ITEMS = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/explorar", label: "Explorar", icon: Compass },
    { href: "/feed?new=true", label: "Publicar", icon: SquarePlus },
    { href: "/carteira", label: "Carteira", icon: Wallet },
    { href: `/perfil/${usernameFallback}`, label: "Perfil", icon: User },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Menu Lateral - Desktop */}
      <aside className="w-64 border-r border-border hidden md:flex flex-col justify-between p-4 fixed h-screen">
        <div className="space-y-6">
          <Link href="/feed" className="text-xl font-bold px-3 block">
            Nexus
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const safeHref = href || "/feed";
              const active =
                activePath === safeHref ||
                (safeHref.startsWith("/feed?")
                  ? activePath === "/feed"
                  : activePath.startsWith(safeHref + "/"));

              return (
                <Link
                  key={label}
                  href={safeHref}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-900 text-white font-semibold dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Área do Conteúdo Principal */}
      <main className="flex-1 md:pl-64 pb-16 md:pb-0 min-h-screen">
        <div className="container max-w-5xl py-6">{children}</div>
      </main>

      {/* Menu Inferior - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md flex items-center justify-around p-2 z-50">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const safeHref = href || "/feed";
          const active =
            activePath === safeHref ||
            (safeHref.startsWith("/feed?")
              ? activePath === "/feed"
              : activePath.startsWith(safeHref + "/"));

          return (
            <Link
              key={label}
              href={safeHref}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
