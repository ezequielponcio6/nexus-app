"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Coins, Search, Sparkles, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";

const suggestedCreators = [
  {
    id: "1",
    name: "Luna Vale",
    username: "lunavale",
    specialty: "Mentoria de branding",
    followers: "24.8k",
    monthlyPrice: 180,
    verified: true,
    accent: "from-violet-500 to-indigo-500",
    bio: "Ajudo criadores a transformar presença em audiência premium.",
  },
  {
    id: "2",
    name: "Theo Marlon",
    username: "theomarlon",
    specialty: "Conteúdo de produtividade",
    followers: "18.4k",
    monthlyPrice: 140,
    verified: false,
    accent: "from-emerald-500 to-teal-500",
    bio: "Sistemas, foco e estratégia para construir rotina de alta performance.",
  },
  {
    id: "3",
    name: "Ari Sato",
    username: "arisato",
    specialty: "Design visual premium",
    followers: "31.2k",
    monthlyPrice: 260,
    verified: true,
    accent: "from-amber-500 to-orange-500",
    bio: "Crio identidades visuais com alto impacto e clareza de posicionamento.",
  },
  {
    id: "4",
    name: "Nina Crest",
    username: "ninacrest",
    specialty: "Lifestyle e presença digital",
    followers: "12.7k",
    monthlyPrice: 110,
    verified: false,
    accent: "from-pink-500 to-rose-500",
    bio: "Conteúdo de estética, disciplina e crescimento pessoal para perfis fortes.",
  },
  {
    id: "5",
    name: "Rafael Diniz",
    username: "rafaeldiniz",
    specialty: "Estratégia de audiência",
    followers: "27.1k",
    monthlyPrice: 220,
    verified: true,
    accent: "from-cyan-500 to-blue-500",
    bio: "Planejamento de conteúdo e escala de alcance para criadores que querem crescer.",
  },
  {
    id: "6",
    name: "Maya Nox",
    username: "mayanox",
    specialty: "Música e trilhas criativas",
    followers: "9.6k",
    monthlyPrice: 95,
    verified: false,
    accent: "from-fuchsia-500 to-purple-500",
    bio: "Aulas de produção artística, moodboards e direção criativa para sua marca.",
  },
];

export default function ExplorarPage() {
  const [query, setQuery] = useState("");

  const filteredCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return suggestedCreators;

    return suggestedCreators.filter((creator) => {
      return (
        creator.name.toLowerCase().includes(normalizedQuery) ||
        creator.username.toLowerCase().includes(normalizedQuery) ||
        creator.specialty.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  return (
    <AppShell activePath="/explorar">
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Descobrir</p>
              <h1 className="mt-2 text-2xl font-black text-foreground">Explorar criadores</h1>
            </div>
            <div className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 sm:inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Curadoria premium
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Buscar por nome, @usuario ou especialidade"
              className="h-12 w-full rounded-2xl border border-border bg-background/80 pl-11 pr-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all placeholder:text-muted-foreground focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Recomendados</h2>
            <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {filteredCreators.length} perfis
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/perfil/${creator.username}`}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_18px_40px_rgba(251,191,36,0.12)]"
              >
                <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${creator.accent} opacity-90`} />

                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={creator.name} size={52} className="ring-2 ring-background" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-bold text-foreground">{creator.name}</h3>
                          {creator.verified && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 px-1.5 py-0.5 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                              aria-label="Usuário VIP PRO verificado"
                              title="Usuário VIP PRO verificado"
                            >
                              <Check className="h-2.5 w-2.5 text-amber-950" />
                              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-950">VIP</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{creator.username}</p>
                      </div>
                    </div>

                    <div className="rounded-full border border-border/80 bg-background/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {creator.followers}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-background/60 p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Especialidade</span>
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{creator.specialty}</p>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">{creator.bio}</p>

                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-300">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="text-sm font-black">NX$ {creator.monthlyPrice}</span>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-90"
                    >
                      Ver perfil
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredCreators.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-muted-foreground">
              Nenhum criador encontrado para a busca atual.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
