"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
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
import { sanitizeTextInput } from "@/lib/sanitize";
import { Camera, ImagePlus } from "lucide-react";
import { useLocalProfileMedia } from "@/components/profile/local-profile-media";

const profileInitialState: ProfileActionState = { error: null };
const creatorInitialState: CreatorSettingsState = { error: null };
const NEXUS_PRO_PRICE_COINS = 1200;

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
  const [coins, setCoins] = useState(0);
  const [plan, setPlan] = useState<string>(profile?.premium_tier ?? "free");
  const { avatarUrl, bannerUrl, selectImage } = useLocalProfileMedia();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedCoins = localStorage.getItem("nexus_coins");
      const savedPlan = localStorage.getItem("nexus_vip_plan");
      const savedStatus = localStorage.getItem("nexus_vip_status");

      if (savedCoins) {
        const parsedCoins = Number(savedCoins);
        if (!Number.isNaN(parsedCoins)) {
          setCoins(parsedCoins);
        }
      }

      const nextPlan = savedPlan || (savedStatus === "pro" ? "VIP PRO" : profile?.premium_tier ?? "free");
      if (nextPlan === "VIP PRO" || nextPlan === "pro") {
        setPlan("VIP PRO");
      } else {
        setPlan(profile?.premium_tier ?? "free");
      }
    } catch {
      setPlan(profile?.premium_tier ?? "free");
    }
  }, [profile?.premium_tier]);

  const isVip = plan === "VIP PRO" || plan === "pro";
  const planLabel = isVip ? "VIP PRO" : profile?.premium_tier ?? "free";

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

  function handleNexusProPurchase() {
    if (isVip) {
      toast.success("Seu status Nexus Pro já está ativo localmente.");
      return;
    }

    const savedCoins = Number(localStorage.getItem("nexus_coins") ?? "0");
    const safeCoins = Number.isFinite(savedCoins) ? savedCoins : 0;
    const savedStreak = Number(localStorage.getItem("nexus_streak") ?? "0");
    const sanitizedPlan = sanitizeTextInput(localStorage.getItem("nexus_vip_plan") ?? "", 32);
    const streakValue = Number.isFinite(savedStreak) ? savedStreak : 0;

    if (safeCoins < NEXUS_PRO_PRICE_COINS) {
      alert("Saldo insuficiente! Você precisa de 1200 NX$ para ativar o VIP PRO. Continue minerando na carteira ou compre moedas.");
      return;
    }

    if (streakValue < 7) {
      alert("Requisito de Fidelidade não atingido! O selo dourado de elite exige uma ofensiva ativa de pelo menos 7 dias seguidos no app para comprovar sua autenticidade.");
      return;
    }

    const remainingCoins = safeCoins - NEXUS_PRO_PRICE_COINS;
    localStorage.setItem("nexus_coins", String(remainingCoins));
    localStorage.setItem("nexus_vip_status", "pro");
    localStorage.setItem("nexus_vip_plan", sanitizedPlan || "VIP PRO");

    setCoins(remainingCoins);
    setPlan("VIP PRO");
    toast.success(`Nexus Pro ativado por ${NEXUS_PRO_PRICE_COINS} NX$ coins.`);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Fotos do perfil</h2>
          <p className="mt-1 text-xs text-muted-foreground">Personalize sua capa e seu avatar. Cada imagem pode ter até 2 MB.</p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="group relative h-28 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-900 dark:to-zinc-800">
            {bannerUrl && <img src={bannerUrl} alt="Prévia da capa" className="h-full w-full object-cover" />}
            <button type="button" onClick={() => bannerInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/0 text-white transition-all hover:bg-black/35">
              <span className="flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-3 py-2 text-xs font-bold backdrop-blur-sm"><Camera className="h-4 w-4" /> Alterar capa</span>
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => selectImage("banner", event.target.files?.[0])} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} alt="Prévia do avatar" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div><p className="text-sm font-medium">Foto de perfil</p><p className="text-xs text-muted-foreground">JPG, PNG ou WebP</p></div>
            </div>
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold transition-colors hover:border-signal hover:text-signal"><Camera className="h-4 w-4" /> Alterar</button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => selectImage("avatar", event.target.files?.[0])} />
          </div>
        </div>
      </Card>

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
              <Label htmlFor="price">Preço mensal (NX$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={5}
                step="1"
                defaultValue={
                  profile?.creator_subscription_price_cents
                    ? Math.max(5, Math.round(profile.creator_subscription_price_cents / 100))
                    : "150"
                }
                placeholder="150"
              />
              <p className="text-xs text-muted-foreground mt-1">Use moedas da carteira para assinar este criador.</p>
            </div>
          )}

          {creatorState.error && <p className="text-sm text-destructive">{creatorState.error}</p>}
          <Button type="submit" variant="outline" disabled={creatorPending} className="self-start">
            {creatorPending ? "Salvando…" : "Salvar configuração de criador"}
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold mb-1">Plano</h2>
          {isVip && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
              VIP PRO
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 via-background to-amber-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plano atual</span>
            <strong className={cn("text-sm font-bold", isVip ? "text-amber-400" : "text-foreground")}>
              {planLabel}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Saldo</span>
            <strong className="text-lg font-black text-foreground">{coins} NX$</strong>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Nexus Pro</p>
              <p className="mt-2 text-sm text-muted-foreground">Acesse recursos premium com a sua carteira interna.</p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400">
              {NEXUS_PRO_PRICE_COINS} NX$
            </span>
          </div>

          <Button
            type="button"
            variant="signal"
            onClick={handleNexusProPurchase}
            disabled={isVip}
            className="mt-4 w-full"
          >
            {isVip ? "Você já é Pro" : "Ativar plano VIP PRO"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
