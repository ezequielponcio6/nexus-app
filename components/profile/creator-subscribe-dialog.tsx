"use client";

import { useEffect, useState } from "react";
import { Coins, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StoredSubscription = { username: string; price: number; subscribedAt: string };

function readCoins() {
  const parsedCoins = Number(localStorage.getItem("nexus_coins"));
  return Number.isFinite(parsedCoins) && parsedCoins > 0 ? parsedCoins : 0;
}

function readSubscriptions(): StoredSubscription[] {
  try {
    const stored = JSON.parse(localStorage.getItem("nexus_subscriptions") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CreatorSubscribeDialog({ username, creatorName, price }: { username: string; creatorName: string; price: number }) {
  const [open, setOpen] = useState(false);
  const [coins, setCoins] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const syncSubscription = () => {
      setCoins(readCoins());
      setSubscribed(readSubscriptions().some((subscription) => subscription.username === username));
    };
    syncSubscription();
    window.addEventListener("storage", syncSubscription);
    return () => window.removeEventListener("storage", syncSubscription);
  }, [username]);

  function confirmSubscription() {
    if (pending || subscribed) return;
    const currentCoins = readCoins();
    if (currentCoins < price) {
      toast.error(`Você precisa de mais NX$ ${price - currentCoins} para assinar.`);
      return;
    }

    setPending(true);
    const nextSubscription: StoredSubscription = { username, price, subscribedAt: new Date().toISOString() };
    const subscriptions = readSubscriptions().filter((subscription) => subscription.username !== username);
    localStorage.setItem("nexus_coins", String(currentCoins - price));
    localStorage.setItem("nexus_subscriptions", JSON.stringify([...subscriptions, nextSubscription]));
    setCoins(currentCoins - price);
    setSubscribed(true);
    setPending(false);
    setOpen(false);
    window.dispatchEvent(new StorageEvent("storage", { key: "nexus_coins" }));
    toast.success(`Assinatura de @${username} ativada!`);
  }

  return (
    <>
      <Button type="button" variant={subscribed ? "outline" : "signal"} size="sm" onClick={() => { setCoins(readCoins()); setOpen(true); }} disabled={subscribed}>
        {subscribed ? "Assinante" : `Assinar · NX$ ${price}/mês`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/40 p-5 text-white">
            <DialogHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-400/10 text-amber-300"><Sparkles className="h-5 w-5" /></div>
              <DialogTitle className="text-white">Assinar {creatorName}</DialogTitle>
              <DialogDescription className="text-zinc-300">Tenha acesso ao conteúdo exclusivo de @{username} por um mês.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Investimento mensal</p><p className="mt-1 text-2xl font-black text-foreground">NX$ {price}</p></div>
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Seu saldo atual</span><strong className={coins >= price ? "text-emerald-500" : "text-destructive"}>NX$ {coins}</strong></div>
            {coins < price && <p className="text-xs leading-5 text-destructive">Saldo insuficiente. Visite a carteira para comprar mais coins.</p>}
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />A cobrança usa somente o saldo local da sua carteira.</div>
            <Button type="button" className="w-full" variant="signal" onClick={confirmSubscription} disabled={pending || coins < price}>{pending ? "Ativando assinatura..." : `Confirmar por NX$ ${price}`}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}