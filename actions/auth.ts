"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authRateLimit } from "@/lib/rate-limit";

export type AuthState = { error: string | null };

async function clientIp() {
  const h = await headers();
  // x-forwarded-for pode trazer uma lista "ip1, ip2" — o primeiro é o cliente real.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/feed");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const ip = await clientIp();
  const { success } = await authRateLimit.limit(`login:${ip}`);
  if (!success) {
    return { error: "Muitas tentativas de login. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensagem genérica de propósito: não revelar se o e-mail existe ou não.
    return { error: "E-mail ou senha inválidos." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password || !displayName) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const ip = await clientIp();
  const { success } = await authRateLimit.limit(`signup:${ip}`);
  if (!success) {
    return { error: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        error.message === "User already registered"
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar a conta. Tente novamente.",
    };
  }

  redirect("/cadastro/confirme");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
