import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OwnProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/perfil");

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  redirect(`/perfil/${profile?.username ?? ""}`);
}
