import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Lê/escreve a sessão via cookies HttpOnly + Secure + SameSite=Lax.
 *
 * IMPORTANTE: chamar `await createClient()` sempre dentro do escopo de uma
 * requisição (não em módulo top-level), pois `cookies()` é por-requisição.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` chamado de um Server Component (sem acesso de escrita).
            // Seguro ignorar aqui: o middleware já cuida do refresh de sessão.
          }
        },
      },
    }
  );
}

/**
 * Cliente com a service_role key — bypassa RLS.
 * Uso EXCLUSIVO em: webhooks do Stripe, jobs internos, rotas admin.
 * NUNCA importar este arquivo em código que roda no browser.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
