import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

/**
 * IMPORTANTE: esta rota usa `service_role`, que ignora RLS por design —
 * é a ÚNICA forma legítima de ativar/atualizar uma assinatura, porque só
 * roda depois que o Stripe confirma criptograficamente (assinatura HMAC
 * do header) que o pagamento de fato aconteceu. O client nunca chega aqui.
 *
 * Duas naturezas de assinatura convivem aqui, distinguidas pelo metadata:
 *  - metadata.creator_id ausente  -> assinatura da PLATAFORMA (Nexus Pro)
 *  - metadata.creator_id presente -> assinatura de um CRIADOR específico
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const creatorId = session.metadata?.creator_id;

      // Só marca premium_tier=pro para assinatura DA PLATAFORMA.
      // Assinatura de criador não muda o tier do assinante.
      if (userId && !creatorId) {
        await supabase.from("profiles").update({ premium_tier: "pro" }).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
      // O metadata de subscription (não do customer) carrega o creator_id,
      // setado no momento da criação da sessão de checkout.
      const creatorId = subscription.metadata?.creator_id || null;

      if (userId) {
        await supabase.from("subscriptions").upsert(
          {
            subscriber_id: userId,
            creator_id: creatorId,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price.id,
            status: subscription.status as any,
            current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          { onConflict: "stripe_subscription_id" }
        );

        if (subscription.status === "active" && !creatorId) {
          await supabase.from("profiles").update({ premium_tier: "pro" }).eq("id", userId);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
      const creatorId = subscription.metadata?.creator_id || null;

      if (userId) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        if (!creatorId) {
          await supabase.from("profiles").update({ premium_tier: "free" }).eq("id", userId);
        }
      }
      break;
    }

    default:
      break; // eventos não tratados são ignorados de propósito
  }

  return NextResponse.json({ received: true });
}
