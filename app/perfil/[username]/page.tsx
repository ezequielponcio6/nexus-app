"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, Calendar, Coins, Flame } from "lucide-react";
import { PremiumVipBadge } from "@/components/ui/premium-vip-badge";
import { CreatorSubscribeDialog } from "@/components/profile/creator-subscribe-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { useLocalProfileMedia } from "@/components/profile/local-profile-media";

const premiumCreators: Record<string, { name: string; price: number }> = {
  lunavale: { name: "Luna Vale", price: 180 },
  arisato: { name: "Ari Sato", price: 260 },
  rafaeldiniz: { name: "Rafael Diniz", price: 220 },
};

export default function PerfilPage() {
  const params = useParams();
  const username = params.username;

  // Estado para armazenar a cor do nome comprada na carteira
  const [nameColor, setNameColor] = useState("text-foreground");
  const [userCoins, setUserCoins] = useState(0);
  const [userStreak, setUserStreak] = useState(1);
  const { avatarUrl, bannerUrl, selectImage } = useLocalProfileMedia();
  const profileUsername = typeof username === "string" ? username : "usuario";
  const creator = premiumCreators[profileUsername.toLowerCase()] ?? { name: `@${profileUsername}`, price: 120 };
  const isPremiumCreator = Boolean(premiumCreators[profileUsername.toLowerCase()]);

  // Carrega as customizações da carteira salvas no navegador
  useEffect(() => {
    const savedColor = localStorage.getItem("nexus_name_color");
    const savedCoins = localStorage.getItem("nexus_coins");
    const savedStreak = localStorage.getItem("nexus_streak");

    if (savedColor) setNameColor(savedColor);
    if (savedCoins) setUserCoins(Number(savedCoins));
    if (savedStreak) setUserStreak(Number(savedStreak));
  }, []);

  // Mapeia a classe css para um nome amigável de exibição da Tag de conquista
  const obterNomeTitulo = (classeCor: string) => {
    switch (classeCor) {
      case "text-purple-500": return "Roxo Neon";
      case "text-emerald-500": return "Cyberpunk";
      case "text-rose-500": return "Creator Épico";
      case "text-amber-500": return "Lendário ⚜️";
      default: return "Membro";
    }
  };

  return (
    <AppShell activePath={`/perfil/${profileUsername}`}>
      <div className="w-full max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in duration-300">
      
      {/* CARD DO PERFIL PREMIUM */}
      <div className="bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
        
        {/* Banner Superior Falso Estilo Twitter */}
        <label
          htmlFor="profile-banner-upload"
          className="group relative block h-32 cursor-pointer overflow-hidden bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-900 dark:to-zinc-800"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <input id="profile-banner-upload" type="file" accept="image/*" className="sr-only" onChange={(event) => selectImage("banner", event.target.files?.[0])} />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <span className="rounded-full border border-white/30 bg-black/40 p-2.5 backdrop-blur-sm"><Camera className="h-5 w-5" /></span>
          </span>
          {/* Tag de Ofensiva no canto do banner */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{userStreak}d Streak</span>
          </div>
        </label>

        {/* Informações do Usuário */}
        <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          
          {/* Avatar com Letra que flutua por cima do banner */}
          <label htmlFor="profile-avatar-upload" className="group relative -mt-12 z-10 flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-zinc-100 text-3xl font-black uppercase text-muted-foreground shadow-md dark:bg-zinc-800">
            <input id="profile-avatar-upload" type="file" accept="image/*" className="sr-only" onChange={(event) => selectImage("avatar", event.target.files?.[0])} />
            {avatarUrl ? <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" /> : (typeof username === "string" ? username[0] : "U")}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
          </label>

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* O NOME GANHA A COR COMPRADA DA CARTEIRA DE FORMA DINÂMICA AQUI */}
              <h1 className={`text-2xl font-black tracking-tight transition-colors ${nameColor}`}>
                @{username}
              </h1>

              <PremiumVipBadge active={isPremiumCreator} className="self-center" />

              {/* Badge ou Título de Prestígio baseado na cor equipada */}
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                nameColor !== "text-foreground" 
                  ? `\${nameColor} bg-zinc-50 dark:bg-zinc-900 border-current/20` 
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {obterNomeTitulo(nameColor)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">Explorando o ecossistema e minerando Nexus Coins.</p>
            
            {/* Metadados / Informações sutil */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Entrou em Setembro de 2026
              </span>
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <Coins className="w-3.5 h-3.5" /> {userCoins} NX\$ acumulados
              </span>
            </div>

            {isPremiumCreator && (
              <div className="pt-3">
                <CreatorSubscribeDialog username={profileUsername} creatorName={creator.name} price={creator.price} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO DAS PUBLICAÇÕES DO USUÁRIO */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Publicações</h2>
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
          Nenhuma publicação feita por este usuário ainda.
        </div>
      </div>

      </div>
    </AppShell>
  );
}
