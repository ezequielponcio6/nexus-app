// Stripe foi removido do fluxo de Nexus Pro para usar somente a economia local
// de nexus_coins no navegador. Mantemos este arquivo em modo off para evitar
// erros de import no frontend ou em rotas antigas.
export const stripe = null as any;
export const STRIPE_PRICE_NEXUS_PRO = "disabled_local_nexus_pro";
