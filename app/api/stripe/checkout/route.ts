import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_NEXUS_PRO } from "@/lib/stripe";
import { checkoutRateLimit, assertNotRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?redirectTo=/configuracoes", request.url));
  }

  try {
    await assertNotRateLimited(checkoutRateLimit, user.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, username")
    .eq("id", user.id)
    .single();

  // Garante um customer Stripe antes do checkout — evita duplicar customers
  // a cada tentativa de assinatura.
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_NEXUS_PRO, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/configuracoes?upgrade=sucesso`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/configuracoes?upgrade=cancelado`,
    metadata: { supabase_user_id: user.id },
    // Sem isso, o metadata NÃO chega ao objeto Subscription entregue nos
    // eventos customer.subscription.* — só ficaria no Checkout Session.
    subscription_data: { metadata: { supabase_user_id: user.id } },
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
