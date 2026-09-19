"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { followRateLimit, assertNotRateLimited } from "@/lib/rate-limit";

export async function toggleFollow(targetId: string, isCurrentlyFollowing: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  if (user.id === targetId) throw new Error("Você não pode seguir a si mesmo.");

  await assertNotRateLimited(followRateLimit, user.id);

  if (isCurrentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
    if (error) throw error;
  }

  revalidatePath("/perfil");
}
