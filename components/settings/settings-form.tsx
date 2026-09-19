"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateProfile,
  setFeedAlgoMode,
  updateCreatorSettings,
  type ProfileActionState,
  type CreatorSettingsState,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FeedAlgoMode } from "@/types/database.types";

const profileInitialState: ProfileActionState = { error: null };
const creatorInitialState: CreatorSettingsState = { error: null };

const MODES: { value: FeedAlgoMode; label: string; description: string }[] = [
  { value: "chronological", label: "Cronológico", description: "Mais recente primeiro, sem curadoria." },
  { value: "balanced", label: "Balanceado", description: "Mistura recência com engajamento." },
  { value: "discovery", label: "Descoberta", description: "Prioriza o que está mais em alta." },
];

interface ProfileData {
  display_name: string;
  bio: string | null;
  feed_algo_mode: FeedAlgoMode;
  premium_tier: string;
  is_creator: boolean;
  creator_subscription_price_cents: number | null;
}

export function SettingsForm({ profile, email }: { profile: ProfileData | null; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, profileInitialState);
  const [mode, setMode] = useState<FeedAlgoMode>(profile?.feed_algo_mode ?? "balanced");
  const [, startTransition] = useTransition();

  const [creatorState, creatorFormAction, creatorPending] = useActionState(
    updateCreatorSettings,
    creatorInitialState
  );
  const [isCreatorChecked, setIsCreatorChecked] = useState(profile?.is_creator ?? false);

  function handleModeChange(next: FeedAlgoMode) {
    setMode(next);
    startTransition(async () => {
      try {
        await setFeedAlgoMode(next);
        toast.success("Preferência de feed atualizada.");
      } catch {
        toast.error("Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-4">Perfil</h2>
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="display_name">Nome de exibição</Label>
            <Input id="display_name" name="display_name" defaultValue={profile?.display_name} required />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} maxLength={280} rows={3} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-1">Preferência de feed</h2>
        <p className="text-xs text-muted-foreground mb-4">
          O controle é seu — troque quando quiser, sem letras miúdas.
        </p>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                mode === m.value ? "border-signal bg-signal/5" : "border-border hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0",
                  mode === m.value ? "border-signal bg-signal" : "border-border"
                )}
              />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{m.description}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-1">Perfil de criador</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Venda uma assinatura mensal individual e publique conteúdo exclusivo para quem assina.
        </p>
        <form action={creatorFormAction} className="flex flex-col gap-4">
          <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              name="is_creator"
              defaultChecked={profile?.is_creator}
              onChange={(e) => setIsCreatorChecked(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-signal"
            />
            Sou um criador e quero vender assinaturas
          </label>

          {isCreatorChecked && (
            <div>
              <Label htmlFor="price">Preço mensal (BRL)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={5}
                step="0.01"
                defaultValue={
                  profile?.creator_subscription_price_cents
                    ? (profile.creator_subscription_price_cents / 100).toFixed(2)
                    : "19.90"
                }
                placeholder="19.90"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo de R$ 5,00.</p>
            </div>
          )}

          {creatorState.error && <p className="text-sm text-destructive">{creatorState.error}</p>}
          <Button type="submit" variant="outline" disabled={creatorPending} className="self-start">
            {creatorPending ? "Salvando…" : "Salvar configuração de criador"}
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-1">Plano</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Plano atual: <strong className="text-foreground">{profile?.premium_tier ?? "free"}</strong>
        </p>
        <Separator className="mb-4" />
        <form action="/api/stripe/checkout" method="POST">
          <Button type="submit" variant="signal" disabled={profile?.premium_tier !== "free"}>
            {profile?.premium_tier === "free" ? "Assinar Nexus Pro" : "Você já é Pro"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
