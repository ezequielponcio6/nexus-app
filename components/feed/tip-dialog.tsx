"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sendTip, type WalletActionState } from "@/actions/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialState: WalletActionState = { error: null };
const QUICK_AMOUNTS = [10, 50, 100];

export function TipDialog({
  receiverId,
  receiverName,
  postId,
  open,
  onOpenChange,
}: {
  receiverId: string;
  receiverName: string;
  postId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(sendTip, initialState);
  const [amount, setAmount] = useState<number | "">(QUICK_AMOUNTS[0]);

  useEffect(() => {
    if (state.success) {
      toast.success(`Coins enviados para ${receiverName}!`);
      onOpenChange(false);
    }
  }, [state.success, receiverName, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Enviar coins</DialogTitle>
          <DialogDescription>para {receiverName}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="receiver_id" value={receiverId} />
          {postId && <input type="hidden" name="post_id" value={postId} />}
          <input type="hidden" name="amount" value={amount} />

          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt)}
                className={cn(
                  "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
                  amount === amt
                    ? "border-signal text-signal"
                    : "border-border hover:border-signal hover:text-signal"
                )}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              placeholder="Outro valor"
              className="flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
            />
            <Button type="submit" disabled={pending || !amount} variant="signal" size="default">
              {pending ? "…" : "Enviar"}
            </Button>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
