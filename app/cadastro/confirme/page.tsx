import { AuthShell } from "@/components/layout/auth-shell";

export default function ConfirmePage() {
  return (
    <AuthShell title="Confira seu e-mail" subtitle="">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Enviamos um link de confirmação para o seu e-mail. Clique nele para
        ativar sua conta — depois é só fazer login normalmente.
      </p>
    </AuthShell>
  );
}
