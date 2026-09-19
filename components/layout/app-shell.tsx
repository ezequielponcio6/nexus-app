"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Compass, Home, Settings, SquarePlus, TrendingUp, User, Users, Wallet } from "lucide-react";
import { SignOutButton } from "./sign-out-button"; 
import { ThemeToggle } from "./theme-toggle";   
import { createClient } from "@/lib/supabase/client";
import { PremiumVipBadge } from "@/components/ui/premium-vip-badge";
import { Avatar } from "@/components/ui/avatar";

interface AppShellProps {
  children: React.ReactNode;
  user?: any;
  activePath?: string;
}

function AppShellContent({ children, user: initialUser, activePath: providedActivePath }: AppShellProps) {
  const pathname = usePathname() || "";
  const activePath = providedActivePath ?? pathname;
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const syncAvatar = () => setAvatarUrl(localStorage.getItem("nexus_avatar_url"));
    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    return () => window.removeEventListener("storage", syncAvatar);
  }, []);

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

  const TRENDING_TOPICS = [
    { label: "#CriadoresNexus", count: "2,4 mil posts" },
    { label: "#DesignQueConecta", count: "1,8 mil posts" },
    { label: "#RotinaDeAltaPerformance", count: "986 posts" },
  ];

  const SUGGESTED_CREATORS = [
    { name: "Luna Vale", username: "lunavale", category: "Branding" },
    { name: "Ari Sato", username: "arisato", category: "Design visual" },
    { name: "Rafael Diniz", username: "rafaeldiniz", category: "Estratégia" },
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
              
              // Separação inteligente das rotas
              let active = false;
              if (safeHref === "/feed?new=true") {
                active = activePath === "/feed" && searchParams.get("new") === "true";
              } else if (safeHref === "/feed") {
                active = activePath === "/feed" && searchParams.get("new") !== "true";
              } else {
                active = activePath === safeHref || activePath.startsWith(safeHref + "/");
              }

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
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={usernameFallback} src={avatarUrl} size={28} />
              <span className="text-sm font-medium text-foreground truncate">{usernameFallback}</span>
              <PremiumVipBadge className="shrink-0" />
            </div>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Área do Conteúdo Principal */}
      <main className="min-w-0 flex-1 pb-16 md:pl-64 md:pb-0">
        <div className="mx-auto grid min-h-screen w-full max-w-[1480px] grid-cols-1 gap-8 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:px-8">
          <section className="min-w-0">{children}</section>

          <aside className="hidden space-y-5 xl:block" aria-label="Painel de Destaques">
            <div className="sticky top-6 space-y-5">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Painel de Destaques</h2>
                    <p className="text-[11px] text-muted-foreground">O que está movimentando a rede</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {TRENDING_TOPICS.map((topic, index) => (
                    <button
                      key={topic.label}
                      type="button"
                      className="group flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Em alta · 0{index + 1}</span>
                        <span className="mt-1 block truncate text-sm font-semibold text-foreground">{topic.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{topic.count}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-signal/10 p-2 text-signal">
                      <Users className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Criadores sugeridos</h2>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Para você</span>
                </div>

                <div className="space-y-1">
                  {SUGGESTED_CREATORS.map((creator) => (
                    <Link
                      key={creator.username}
                      href={`/perfil/${creator.username}`}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-amber-500 text-xs font-black text-white dark:from-zinc-100 dark:to-amber-400 dark:text-zinc-950">
                        {creator.name.split(" ").map((part) => part[0]).join("")}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{creator.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{creator.category}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-signal">Ver perfil</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>

      {/* Menu Inferior - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md flex items-center justify-around p-2 z-50">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const safeHref = href || "/feed";
          
          let active = false;
          if (safeHref === "/feed?new=true") {
            active = activePath === "/feed" && searchParams.get("new") === "true";
          } else if (safeHref === "/feed") {
            active = activePath === "/feed" && searchParams.get("new") !== "true";
          } else {
            active = activePath === safeHref || activePath.startsWith(safeHref + "/");
          }

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

// Envelopado em Suspense para evitar erros no build de produção do Next.js
export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando menu...</div>}>
      <AppShellContent {...props} />
    </Suspense>
  );
}
