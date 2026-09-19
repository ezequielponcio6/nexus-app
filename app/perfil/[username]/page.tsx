import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import { FollowButton } from "@/components/profile/follow-button";
import { SubscribeButton } from "@/components/profile/subscribe-button";
import { BadgeCheck, Lock } from "lucide-react";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  // 1. Busca o usuário autenticado de forma segura
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 2. Busca as colunas do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_verified, is_creator, creator_subscription_price_cents, followers_count, following_count")
    .eq("username", username)
    .single();

  // Se não achar o registro na tabela de perfis, abre a página de não encontrado
  if (!profile) {
    notFound();
  }

  const isOurProfile = currentUser && profile ? currentUser.id === profile.id : false;

  let isFollowing = false;
  let isSubscribed = false;

  if (currentUser && profile && !isOurProfile) {
    const [{ data: followRow }, { data: subRow }] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.id)
        .eq("follower_id", currentUser.id)
        .single(),
      supabase
        .from("subscriptions")
        .select("id")
        .eq("creator_id", profile.id)
        .eq("subscriber_id", currentUser.id)
        .eq("status", "active")
        .single(),
    ]);

    isFollowing = !!followRow;
    isSubscribed = !!subRow;
  }

  // Define um nome seguro para exibição e uma letra padrão para o avatar caso falte dados
  const displayName = profile.display_name || profile.username || "Usuário";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <AppShell user={currentUser}>
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Avatar com fallback seguro corrigido */}
          <Avatar 
            src={profile.avatar_url || ""} 
            fallback={avatarFallback} 
            className="w-24 h-24 text-2xl" 
          />
          
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {profile.is_verified && <BadgeCheck className="w-6 h-6 text-blue-500" />}
          </div>

          <p className="text-zinc-500">@{profile.username}</p>
          
          {profile.bio && <p className="text-zinc-700 max-w-md">{profile.bio}</p>}

          <div className="flex space-x-6 text-sm text-zinc-500">
            <div><span className="font-semibold text-zinc-800">{profile.followers_count || 0}</span> Seguidores</div>
            <div><span className="font-semibold text-zinc-800">{profile.following_count || 0}</span> Seguindo</div>
          </div>

          <div className="flex space-x-3 pt-2">
            {!isOurProfile && (
              <>
                <FollowButton profileId={profile.id} initialIsFollowing={isFollowing} />
                {profile.is_creator && (
                  <SubscribeButton 
                    creatorId={profile.id} 
                    priceCents={profile.creator_subscription_price_cents || 0} 
                    initialIsSubscribed={isSubscribed} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
