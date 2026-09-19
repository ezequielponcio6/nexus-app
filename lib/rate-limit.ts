import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting real via Upstash Redis (serverless-friendly, funciona em
 * ambiente edge/lambda sem estado local compartilhado entre instâncias —
 * um Map em memória NÃO funcionaria em produção com múltiplas instâncias).
 *
 * Em desenvolvimento, se as env vars do Upstash não estiverem configuradas,
 * cai para um limitador em memória (best-effort, só para não travar o dev
 * local) e avisa uma única vez no console. Nunca falha silenciosamente em
 * produção: se `NODE_ENV === "production"` sem Redis configurado, lança erro
 * no boot em vez de deixar as rotas sensíveis sem proteção nenhuma.
 */

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (!hasUpstash && process.env.NODE_ENV === "production") {
  throw new Error(
    "UPSTASH_REDIS_REST_URL/TOKEN ausentes em produção — rate limiting é obrigatório antes de expor rotas públicas."
  );
}

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function makeLimiter(requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: "nexus",
    });
  }

  // Fallback em memória — só para `pnpm dev` sem Redis configurado.
  const hits = new Map<string, number[]>();
  const windowMs = parseWindowToMs(window);
  let warned = false;

  return {
    async limit(identifier: string) {
      if (!warned) {
        console.warn(
          "[rate-limit] UPSTASH_REDIS_REST_URL não configurado — usando limitador em memória (não usar em produção com múltiplas instâncias)."
        );
        warned = true;
      }
      const now = Date.now();
      const timestamps = (hits.get(identifier) ?? []).filter((t) => now - t < windowMs);
      timestamps.push(now);
      hits.set(identifier, timestamps);
      const success = timestamps.length <= requests;
      return { success, limit: requests, remaining: Math.max(0, requests - timestamps.length), reset: now + windowMs };
    },
  };
}

function parseWindowToMs(window: string) {
  const [value, unit] = window.split(" ");
  const n = Number(value);
  if (unit === "s") return n * 1000;
  if (unit === "m") return n * 60 * 1000;
  if (unit === "h") return n * 60 * 60 * 1000;
  return n * 1000;
}

// ------- Limitadores por tipo de ação -------
// Escritas de baixo custo mas alto risco de spam:
export const postRateLimit = makeLimiter(5, "1 m"); // 5 posts/min
export const likeRateLimit = makeLimiter(60, "1 m"); // curtidas são baratas, mas ainda limitadas
export const commentRateLimit = makeLimiter(10, "1 m");
export const tipRateLimit = makeLimiter(10, "1 m"); // movimenta dinheiro — mais restrito
export const followRateLimit = makeLimiter(30, "1 m");

// Autenticação — protege contra força bruta e criação massiva de contas.
export const authRateLimit = makeLimiter(8, "5 m");

// Checkout do Stripe — evita abrir centenas de sessões de pagamento.
export const checkoutRateLimit = makeLimiter(5, "5 m");

export async function assertNotRateLimited(
  limiter: ReturnType<typeof makeLimiter>,
  identifier: string
) {
  const { success } = await limiter.limit(identifier);
  if (!success) {
    throw new Error("Muitas tentativas em pouco tempo. Aguarde um momento e tente de novo.");
  }
}
