"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setFeedAlgoMode } from "@/actions/profile";
import { PostCard, type FeedPost } from "@/components/feed/post-card";
import { Composer } from "@/components/feed/composer";
import { FeedModeSwitch } from "@/components/feed/mode-switch";
import type { FeedAlgoMode } from "@/types/database.types";

export function RealtimeFeed({
  initialPosts,
  initialMode,
  likedPostIds,
  currentUserId,
  isCreator,
}: {
  initialPosts: FeedPost[];
  initialMode: FeedAlgoMode;
  likedPostIds: string[];
  currentUserId: string;
  isCreator: boolean;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [mode, setMode] = useState<FeedAlgoMode>(initialMode);
  const [liked, setLiked] = useState<Set<string>>(new Set(likedPostIds));
  const router = useRouter();
  const searchParams = useSearchParams();
  const showComposer = searchParams.get("compose") === "1";

  useEffect(() => setPosts(initialPosts), [initialPosts]);
  useEffect(() => setMode(initialMode), [initialMode]);

  // ------- Supabase Realtime: novos posts entram no topo em tempo real -------
  // O Realtime do Supabase aplica a mesma RLS de SELECT da tabela `posts`
  // (posts_select_visibility) para cada assinante — um usuário nunca recebe
  // aqui um INSERT de um post que ele não teria permissão de ler via query.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          // Payload do Realtime não traz o join com `profiles` — busca à parte.
          const { data: author } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, is_verified, is_creator")
            .eq("id", payload.new.author_id)
            .single();

          if (!author) return;

          const newPost: FeedPost = {
            id: payload.new.id,
            content: payload.new.content,
            media_urls: payload.new.media_urls ?? [],
            visibility: payload.new.visibility ?? "public",
            created_at: payload.new.created_at,
            likes_count: 0,
            comments_count: 0,
            author_id: payload.new.author_id,
            author,
          };

          // Modo cronológico/balanceado: entra no topo. Descoberta: só no próximo refresh.
          setMode((currentMode) => {
            if (currentMode !== "discovery") {
              setPosts((prev) => [newPost, ...prev]);
            }
            return currentMode;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleModeChange = useCallback(
    async (nextMode: FeedAlgoMode) => {
      setMode(nextMode);
      await setFeedAlgoMode(nextMode);
      router.refresh(); // busca a ordenação correta do servidor pro novo modo
    },
    [router]
  );

  const closeComposer = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("compose");
    router.replace(`/feed${params.toString() ? `?${params}` : ""}`);
  }, [router, searchParams]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display italic text-xl font-medium">Seu feed</h1>
        <FeedModeSwitch mode={mode} onChange={handleModeChange} />
      </div>

      {showComposer && <Composer onDone={closeComposer} isCreator={isCreator} />}

      <div className="flex flex-col gap-3.5">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Ainda não há posts por aqui. Que tal publicar o primeiro?
          </p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isLiked={liked.has(post.id)}
            currentUserId={currentUserId}
            onToggleLike={(id, nowLiked) =>
              setLiked((prev) => {
                const next = new Set(prev);
                nowLiked ? next.add(id) : next.delete(id);
                return next;
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
