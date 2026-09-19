import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GeneralProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pega o username do metadado ou do início do e-mail de forma segura
  const username = user.user_metadata?.username || user.email?.split("@")[0];

  if (username) {
    redirect(`/perfil/${username}`);
  }

  redirect("/feed");
}
