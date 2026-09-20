"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, Calendar, Coins, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PremiumVipBadge } from "@/components/ui/premium-vip-badge";
import { CreatorSubscribeDialog } from "@/components/profile/creator-subscribe-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { useLocalProfileMedia } from "@/components/profile/local-profile-media";
import { PersistentPostActions } from "@/components/feed/persistent-post-actions";
import { formatRelativeTime } from "@/lib/format-relative-time";

const premiumCreators: Record<string, { name: string; price: number }> = {
  lunavale: { name: "Luna Vale", price: 180 },
  arisato: { name: "Ari Sato", price: 260 },
  rafaeldiniz: { name: "Rafael Diniz", price: 220 },
};

interface ProfilePost {
  id: string;
  content: string | null;
  media_urls: string[];
  created_at: string;
  author_id: string;
}

function ProfilePostMedia({ mediaUrls, onClick }: { mediaUrls: string[]; onClick?: () => void }) {
  const mediaUrl = mediaUrls?.[0];
  if (!mediaUrl) return null;

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl);

  return (
    <div onClick={onClick} className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted/20 transition-opacity hover:opacity-95">
      {isVideo ? (
        <video src={mediaUrl} controls preload="metadata" className="block max-h-[400px] w-full object-cover" />
      ) : (
        <img src={mediaUrl} alt="Mídia da publicação" className="block max-h-[400px] w-full object-cover" />
      )}
    </div>
  );
}

export default function PerfilPage() {
  const supabase = createClient();
  const params = useParams();
  const username = params.username;

  // Estado para armazenar a cor do nome comprada na carteira
  const [nameColor, setNameColor] = useState("text-foreground");
  const [userCoins, setUserCoins] = useState(0);
  const [userStreak, setUserStreak] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profilePosts, setProfilePosts] = useState<ProfilePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [expandedPost, setExpandedPost] = useState<ProfilePost | null>(null);
  const { avatarUrl, bannerUrl, selectImage } = useLocalProfileMedia();
  const profileUsername = typeof username === "string" ? username : "usuario";
  const creator = premiumCreators[profileUsername.toLowerCase()] ?? { name: `@${profileUsername}`, price: 120 };
  const isPremiumCreator = Boolean(premiumCreators[profileUsername.toLowerCase()]);

  const fetchUserPosts = async (currentUserId: string) => {
    setLoadingPosts(true);

    try {
      const { data, error } = await (supabase.from("posts") as any)
        .select("*")
        .eq("author_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfilePosts((data as ProfilePost[]) ?? []);
    } catch (error) {
      console.error("Erro ao buscar publicações do perfil:", error);
      setProfilePosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Carrega as customizações da carteira salvas no navegador
  useEffect(() => {
    const savedColor = localStorage.getItem("nexus_name_color");
    const savedCoins = localStorage.getItem("nexus_coins");
    const savedStreak = localStorage.getItem("nexus_streak");

    if (savedColor) setNameColor(savedColor);
    if (savedCoins) setUserCoins(Number(savedCoins));
    if (savedStreak) setUserStreak(Number(savedStreak));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfilePosts = async () => {
      setLoadingPosts(true);
      const { data: profile, error } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("username", profileUsername)
        .maybeSingle();

      if (cancelled) return;

      if (error || !profile?.id) {
        setProfileId(null);
        setProfilePosts([]);
        setLoadingPosts(false);
        return;
      }

      setProfileId(profile.id);
      await fetchUserPosts(profile.id);
    };

    void loadProfilePosts();
    return () => {
      cancelled = true;
    };
  }, [profileUsername]);

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
        {loadingPosts ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando publicações...</div>
        ) : !profileId || profilePosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-zinc-50 py-12 text-center text-sm text-muted-foreground dark:bg-zinc-900/30">
            Nenhuma publicação feita por este usuário ainda.
          </div>
        ) : (
          <div className="space-y-0">
            {profilePosts.map((post) => (
              <article key={post.id} className="flex gap-3 border-b border-border/70 bg-background px-1 py-4 first:pt-1">
                <div className="shrink-0 pt-1">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar do perfil" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">{profileUsername[0]?.toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className={`truncate text-sm font-bold ${nameColor}`}>@{profileUsername}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(post.created_at)}</span>
                  </div>
                  {post.content && <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground">{post.content}</p>}
                  <ProfilePostMedia mediaUrls={post.media_urls} onClick={() => setExpandedPost(post)} />
                  <PersistentPostActions
                    post={post}
                    onUpdated={(content) => setProfilePosts((current) => current.map((item) => item.id === post.id ? { ...item, content } : item))}
                    onDeleted={() => setProfilePosts((current) => current.filter((item) => item.id !== post.id))}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {expandedPost?.media_urls?.[0] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setExpandedPost(null)} role="dialog" aria-modal="true" aria-label="Publicação expandida">
          <div className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background md:flex-row" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setExpandedPost(null)} className="absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-black/50 p-2 text-white transition-colors hover:bg-black/80" aria-label="Fechar publicação expandida">
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-[52%] w-full items-center justify-center bg-zinc-950 p-3 md:h-full md:w-[60%] md:p-6">
              {expandedPost.media_urls[0].match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                <video src={expandedPost.media_urls[0]} controls autoPlay className="max-h-full max-w-full object-contain" />
              ) : (
                <img src={expandedPost.media_urls[0]} alt="Mídia expandida da publicação" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <aside className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-t border-border bg-background p-5 md:h-full md:w-[40%] md:border-l md:border-t-0">
              <div className="flex items-center gap-3 border-b border-border pb-4 pr-8">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar do perfil" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">{profileUsername[0]?.toUpperCase()}</div>}
                <div className="min-w-0">
                  <p className={`truncate text-sm font-bold ${nameColor}`}>@{profileUsername}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(expandedPost.created_at)}</p>
                </div>
              </div>
              {expandedPost.content && <p className="whitespace-pre-wrap break-words py-5 text-sm leading-6 text-foreground">{expandedPost.content}</p>}
              <PersistentPostActions
                post={expandedPost}
                onUpdated={(content) => {
                  setProfilePosts((current) => current.map((item) => item.id === expandedPost.id ? { ...item, content } : item));
                  setExpandedPost((current) => current ? { ...current, content } : current);
                }}
                onDeleted={() => {
                  setProfilePosts((current) => current.filter((item) => item.id !== expandedPost.id));
                  setExpandedPost(null);
                }}
              />
            </aside>
          </div>
        </div>
      )}

      </div>
    </AppShell>
  );
}
