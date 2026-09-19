"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeTextInput } from "@/lib/sanitize";
import type { FeedAlgoMode } from "@/types/database.types";

export type ProfileActionState = { error: string | null; success?: boolean };

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const displayName = sanitizeTextInput(formData.get("display_name") ?? "", 80);
  const bio = sanitizeTextInput(formData.get("bio") ?? "", 280);

  if (!displayName) return { error: "O nome de exibição não pode ficar vazio." };
  if (bio.length > 280) return { error: "A bio excede 280 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/configuracoes");
  revalidatePath("/perfil");
  return { error: null, success: true };
}

/**
 * Devolve o controle do algoritmo ao usuário: grava a preferência de
 * ordenação do feed diretamente na coluna `profiles.feed_algo_mode`.
 */
export async function setFeedAlgoMode(mode: FeedAlgoMode) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase
    .from("profiles")
    .update({ feed_algo_mode: mode })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/feed");
}

export type CreatorSettingsState = { error: string | null; success?: boolean };

/**
 * Ativa/edita o perfil de criador e o preço mensal da assinatura individual.
 * O preço fica em `profiles.creator_subscription_price_cents` e é lido pelo
 * checkout dinâmico do Stripe (ver /api/stripe/checkout-creator).
 */
export async function updateCreatorSettings(
  _prev: CreatorSettingsState,
  formData: FormData
): Promise<CreatorSettingsState> {
  const isCreator = formData.get("is_creator") === "on";
  const priceReais = Number(formData.get("price") ?? 0);

  if (isCreator && (!priceReais || priceReais < 5)) {
    return { error: "Defina um preço mínimo de R$ 5,00 para sua assinatura." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({
      is_creator: isCreator,
      creator_subscription_price_cents: isCreator ? Math.round(priceReais * 100) : null,
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  revalidatePath("/perfil");
  return { error: null, success: true };
}
