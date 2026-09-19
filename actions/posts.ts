"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postRateLimit, likeRateLimit, assertNotRateLimited } from "@/lib/rate-limit";
import type { PostVisibility } from "@/types/database.types";

export type PostFormState = { error: string | null };

const MAX_MEDIA_PER_POST = 4;

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const content = String(formData.get("content") ?? "").trim();
  const visibility = (String(formData.get("visibility") ?? "public") as PostVisibility) || "public";
  const mediaUrlsRaw = String(formData.get("media_urls") ?? "[]");

  if (!content && mediaUrlsRaw === "[]") return { error: "O post não pode estar vazio." };
  if (content.length > 3000) return { error: "Post excede o limite de 3000 caracteres." };
  if (!["public", "followers", "subscribers"].includes(visibility)) {
    return { error: "Visibilidade inválida." };
  }

  let mediaUrls: string[] = [];
  try {
    mediaUrls = JSON.parse(mediaUrlsRaw);
    if (!Array.isArray(mediaUrls) || mediaUrls.some((u) => typeof u !== "string")) throw new Error();
  } catch {
    return { error: "Mídia inválida." };
  }
  if (mediaUrls.length > MAX_MEDIA_PER_POST) {
    return { error: `Máximo de ${MAX_MEDIA_PER_POST} imagens por post.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  try {
    await assertNotRateLimited(postRateLimit, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Só um usuário marcado como criador pode postar exclusivo pra assinantes.
  if (visibility === "subscribers") {
    const { data: profile } = await supabase.from("profiles").select("is_creator").eq("id", user.id).single();
    if (!profile?.is_creator) {
      return { error: "Só criadores podem publicar conteúdo exclusivo para assinantes." };
    }
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    content: content || null,
    media_urls: mediaUrls,
    visibility,
    is_premium_content: visibility === "subscribers",
  });

  if (error) {
    console.error("createPost error:", error);
    return { error: "Não foi possível publicar. Tente novamente." };
  }

  revalidatePath("/feed");
  return { error: null };
}

/**
 * Curtir/descurtir é otimista no client (ver components/feed/post-card.tsx).
 * Esta action é a fonte da verdade no servidor — RLS garante que
 * `user_id` só pode ser o próprio usuário autenticado.
 */
export async function toggleLike(postId: string, isCurrentlyLiked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");
  await assertNotRateLimited(likeRateLimit, user.id);

  if (isCurrentlyLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    if (error) throw error;
  }

  revalidatePath("/feed");
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // RLS (posts_delete_own) já impede apagar post de outro autor;
  // o filtro abaixo é só para dar um erro claro em vez de "0 rows affected".
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) throw error;

  revalidatePath("/feed");
}
