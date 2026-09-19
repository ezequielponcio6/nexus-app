"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commentRateLimit, likeRateLimit, assertNotRateLimited } from "@/lib/rate-limit";

export type CommentFormState = { error: string | null };

export async function createComment(
  postId: string,
  content: string,
  parentCommentId: string | null = null
): Promise<CommentFormState> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "O comentário não pode estar vazio." };
  if (trimmed.length > 1000) return { error: "Comentário excede 1000 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  try {
    await assertNotRateLimited(commentRateLimit, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    content: trimmed,
    parent_comment_id: parentCommentId,
  });

  if (error) {
    console.error("createComment error:", error);
    return { error: "Não foi possível comentar. Tente novamente." };
  }

  revalidatePath("/feed");
  return { error: null };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("author_id", user.id);
  if (error) throw error;

  revalidatePath("/feed");
}

export async function toggleCommentLike(commentId: string, isCurrentlyLiked: boolean) {
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
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("likes").insert({ comment_id: commentId, user_id: user.id });
    if (error) throw error;
  }
}
