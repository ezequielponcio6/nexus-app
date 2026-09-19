import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function FeedLayout({ children }: { children: ReactNode }) {
  // Usuário simulado para o menu renderizar corretamente
  const mockUser = {
    email: "cole.duda1789@nexus.com",
    user_metadata: { username: "cole.duda1789" }
  };

  return <AppShell user={mockUser}>{children}</AppShell>;
}
