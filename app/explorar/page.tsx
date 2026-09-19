import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import { BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExplorarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/explorar");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_verified, is_creator, followers_count")
    .order("followers_count", { ascending: false })
    .limit(20);

  return (
    <AppShell activePath="/explorar">
      <h1 className="font-display italic text-xl font-medium mb-5">Explorar</h1>

      <div className="flex flex-col gap-2">
        {profiles?.map((p) => (
          <Link
            key={p.id}
            href={`/perfil/${p.username}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/60 transition-colors"
          >
            <Avatar name={p.display_name} src={p.avatar_url} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {p.display_name}
                {p.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-live" />}
                {p.is_creator && <Badge variant="signal">Criador</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                @{p.username} · {p.followers_count} seguidores
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
