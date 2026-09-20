"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Bell, Compass, Home, Settings, SquarePlus, TrendingUp, User, Users, Wallet } from "lucide-react";
import { SignOutButton } from "./sign-out-button"; 
import { ThemeToggle } from "./theme-toggle";   
import { createClient } from "@/lib/supabase/client";
import { PremiumVipBadge } from "@/components/ui/premium-vip-badge";
import { Avatar } from "@/components/ui/avatar";
import { DirectMessages } from "./direct-messages";

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
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  useEffect(() => {
    const syncAvatar = () => setAvatarUrl(localStorage.getItem("nexus_avatar_url"));
    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    return () => window.removeEventListener("storage", syncAvatar);
  }, []);

  useEffect(() => {
    const syncUnreadNotifications = () => {
      const stored = Number(localStorage.getItem("nexus_notifications_unread"));
      setUnreadNotifications(Number.isFinite(stored) ? Math.max(0, stored) : 3);
    };
    syncUnreadNotifications();
    window.addEventListener("storage", syncUnreadNotifications);
    return () => window.removeEventListener("storage", syncUnreadNotifications);
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
    { href: "/notificacoes", label: "Notificações", icon: Bell, badge: unreadNotifications },
    { href: `/perfil/${usernameFallback}`, label: "Perfil", icon: User },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  const TRENDING_TOPICS = [
    { label: "#CriadoresNexus", count: "2,4 mil posts" },
    { label: "#DesignQueConecta", count: "1,8 mil posts" },
    { label: "#RotinaDeAltaPerformance", count: "986 posts" },
  ];

  const SUGGESTED_CREATORS = [
    { name: "Luna Vale", username: "lunavale", category: "Branding", avatar: "https://i.pravatar.cc/96?img=47" },
    { name: "Ari Sato", username: "arisato", category: "Design visual", avatar: "https://i.pravatar.cc/96?img=32" },
    { name: "Rafael Diniz", username: "rafaeldiniz", category: "Estratégia", avatar: "https://i.pravatar.cc/96?img=12" },
  ];

  const toggleFollowCreator = (username: string) => {
    setFollowedCreators((current) => ({ ...current, [username]: !current[username] }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex md:h-screen md:overflow-hidden">
      {/* Menu Lateral - Desktop */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen overflow-y-auto w-64 border-r border-border flex-col justify-between p-4">
        <div className="space-y-6">
          <Link href="/feed" className="text-xl font-bold px-3 block">
            Nexus
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
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
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    {label}
                    {badge ? <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white">{badge}</span> : null}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <Avatar name={usernameFallback} src={avatarUrl} size={28} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-[10px] font-medium text-emerald-500">• Ativo agora</span>
                <span className="block truncate text-sm font-medium text-foreground">{usernameFallback}</span>
              </div>
              <PremiumVipBadge className="shrink-0" />
            </div>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Área do Conteúdo Principal */}
      <main className="min-w-0 flex-1 pb-16 md:h-screen md:overflow-y-auto md:pl-64 md:pb-0 lg:pr-80">
        <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">
          {children}
        </div>
      </main>

      {/* Painel Direito - Desktop */}
      <aside className="hidden lg:block fixed top-0 right-0 h-screen w-80 border-l border-border bg-background p-4 overflow-y-auto" aria-label="Painel de Amigos e Seguidores">
        <div className="space-y-6">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-signal/10 p-2 text-signal"><Users className="h-4 w-4" /></div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Sugestões de Seguidores</h2>
                <p className="text-[11px] text-muted-foreground">Pessoas para acompanhar</p>
              </div>
            </div>
            <div className="space-y-1">
              {SUGGESTED_CREATORS.map((creator) => (
                <div key={creator.username} className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-muted/60">
                  <Link href={`/perfil/${creator.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative shrink-0">
                      <img src={creator.avatar} alt={`Avatar de ${creator.name}`} className="h-10 w-10 rounded-full object-cover ring-2 ring-background" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                      {creator.name}
                      <PremiumVipBadge active className="scale-75 origin-left" />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{creator.category}</span>
                  </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFollowCreator(creator.username)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                      followedCreators[creator.username]
                        ? "bg-muted text-muted-foreground"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {followedCreators[creator.username] ? "Seguindo" : "Seguir"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><TrendingUp className="h-4 w-4" /></div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Assuntos em Alta</h2>
                <p className="text-[11px] text-muted-foreground">O que movimenta a rede</p>
              </div>
            </div>
            <div className="space-y-1">
              {TRENDING_TOPICS.map((topic, index) => (
                <button key={topic.label} type="button" className="group flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60">
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
        </div>
      </aside>

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
      <DirectMessages />
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
