"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/layout/auth-shell";

const initialState: AuthState = { error: null };

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="Seu feed, suas regras, seu valor de volta pra você."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="display_name">Nome</Label>
          <Input id="display_name" name="display_name" placeholder="Como devemos te chamar?" required />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="voce@email.com" required autoComplete="email" />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Ao continuar, você concorda com nossos Termos e Política de Privacidade.
        </p>
      </form>
    </AuthShell>
  );
}
