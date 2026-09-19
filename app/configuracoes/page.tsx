import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/configuracoes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, feed_algo_mode, premium_tier, is_creator, creator_subscription_price_cents")
    .eq("id", user.id)
    .single();

  return (
    <AppShell activePath="/configuracoes">
      <h1 className="font-display italic text-xl font-medium mb-5">Configurações</h1>
      <SettingsForm profile={profile} email={user.email ?? ""} />
    </AppShell>
  );
}
