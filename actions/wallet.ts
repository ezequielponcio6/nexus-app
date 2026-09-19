"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tipRateLimit, assertNotRateLimited } from "@/lib/rate-limit";

export type WalletActionState = { error: string | null; success?: boolean };

/**
 * Envia coins para um criador. Não escreve na tabela `wallets` diretamente —
 * chama a função `transfer_wallet_funds` (SECURITY DEFINER) definida no
 * schema.sql, que valida saldo e grava o ledger de forma atômica.
 */
export async function sendTip(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  const receiverId = String(formData.get("receiver_id") ?? "");
  const postId = formData.get("post_id") ? String(formData.get("post_id")) : null;
  const amount = Number(formData.get("amount") ?? 0);

  if (!receiverId) return { error: "Destinatário inválido." };
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Informe um valor válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (user.id === receiverId) return { error: "Você não pode enviar coins para si mesmo." };

  try {
    await assertNotRateLimited(tipRateLimit, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase.rpc("transfer_wallet_funds", {
    p_sender_id: user.id,
    p_receiver_id: receiverId,
    p_amount: amount,
    p_type: "tip_sent",
    p_reference_id: postId,
  });

  if (error) {
    console.error("sendTip error:", error);
    const message = error.message.includes("Saldo insuficiente")
      ? "Saldo insuficiente para essa transferência."
      : "Não foi possível concluir a transferência.";
    return { error: message };
  }

  revalidatePath("/carteira");
  revalidatePath("/feed");
  return { error: null, success: true };
}
