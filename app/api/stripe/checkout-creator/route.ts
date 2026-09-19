import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { checkoutRateLimit, assertNotRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const formData = await request.formData();
  const creatorId = String(formData.get("creator_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?redirectTo=/perfil", request.url));
  }
  if (!creatorId || creatorId === user.id) {
    return NextResponse.json({ error: "Criador inválido." }, { status: 400 });
  }

  try {
    await assertNotRateLimited(checkoutRateLimit, user.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  const [{ data: subscriberProfile }, { data: creator }] = await Promise.all([
    supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single(),
    supabase
      .from("profiles")
      .select("id, username, display_name, is_creator, creator_subscription_price_cents")
      .eq("id", creatorId)
      .single(),
  ]);

  if (!creator?.is_creator || !creator.creator_subscription_price_cents) {
    return NextResponse.json({ error: "Este perfil não vende assinaturas no momento." }, { status: 400 });
  }

  let customerId = subscriberProfile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Preço criado dinamicamente por criador — evita ter que cadastrar um
  // Price ID manual no painel do Stripe para cada criador da plataforma.
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "brl",
          unit_amount: creator.creator_subscription_price_cents,
          recurring: { interval: "month" },
          product_data: {
            name: `Assinatura de @${creator.username}`,
            description: `Acesso ao conteúdo exclusivo de ${creator.display_name} no Nexus`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/perfil/${creator.username}?assinatura=sucesso`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/perfil/${creator.username}?assinatura=cancelada`,
    metadata: {
      supabase_user_id: user.id,
      creator_id: creator.id,
    },
    // Sem isso, o metadata NÃO chega ao objeto Subscription entregue nos
    // eventos customer.subscription.* — só ficaria no Checkout Session.
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        creator_id: creator.id,
      },
    },
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
