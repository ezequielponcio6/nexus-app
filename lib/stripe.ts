import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

// IDs de preço configurados no painel do Stripe — mover para env em produção
// se forem mudar entre ambientes de teste/produção.
export const STRIPE_PRICE_NEXUS_PRO = process.env.STRIPE_PRICE_NEXUS_PRO!;
