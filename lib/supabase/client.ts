import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para Client Components ("use client").
 * A sessão é lida do cookie HttpOnly gerenciado pelo middleware —
 * o JS do browser nunca tem acesso direto ao token (mitiga XSS).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
