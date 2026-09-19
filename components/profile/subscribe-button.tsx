"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscribeButton({
  creatorId,
  priceCents,
  isSubscribed,
}: {
  creatorId: string;
  priceCents: number;
  isSubscribed: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const priceLabel = (priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (isSubscribed) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Lock className="h-3.5 w-3.5" /> Assinante
      </Button>
    );
  }

  return (
    <form
      action="/api/stripe/checkout-creator"
      method="POST"
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="creator_id" value={creatorId} />
      <Button type="submit" variant="signal" size="sm" disabled={submitting}>
        {submitting ? "Redirecionando…" : `Assinar · ${priceLabel}/mês`}
      </Button>
    </form>
  );
}
