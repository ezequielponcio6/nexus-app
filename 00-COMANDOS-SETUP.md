# Setup do Projeto — "Nexus" (nome de trabalho)

Execute na ordem. Ambiente assumido: Node 20+, pnpm.

## 1. Criar o projeto Next.js

```bash
pnpm create next-app@latest nexus --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd nexus
```

## 2. Substituir pelos arquivos entregues

Copie todo o conteúdo deste pacote (`app/`, `components/`, `actions/`, `lib/`,
`types/`, `middleware.ts`, `tailwind.config.ts`, `package.json`, `tsconfig.json`,
`postcss.config.mjs`) por cima da pasta gerada no passo 1, sobrescrevendo tudo.

## 3. Instalar dependências

O `package.json` entregue já lista exatamente o que o código usa — não é
preciso adicionar pacote por pacote:

```bash
pnpm install
```

Isso cobre: `@supabase/ssr` e `@supabase/supabase-js` (auth/dados), `stripe`
e `@stripe/stripe-js` (monetização), `framer-motion` (micro-interações),
`next-themes` (dark mode sem flash), `sonner` (toasts), `lucide-react`
(ícones), `date-fns` (datas relativas em pt-BR), `class-variance-authority`
+ `clsx` + `tailwind-merge` (variantes de componentes), `tailwindcss-animate`.

> Os componentes de UI (`components/ui/*`) já vêm escritos à mão neste
> pacote — não é necessário rodar `shadcn init` nem `shadcn add`. Se quiser
> trocá-los pelos oficiais do shadcn/ui mais tarde (com Radix completo por
> trás de Dialog, Dropdown etc.), pode rodar `pnpm dlx shadcn@latest add ...`
> a qualquer momento; os nomes de import (`@/components/ui/...`) foram
> mantidos compatíveis.

## 4. Variáveis de ambiente

Crie `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key   # NUNCA expor ao client

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_NEXUS_PRO=price_...                 # ID do preço da assinatura Pro no painel Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Rate limiting (Upstash Redis - free tier serve bem para começar)
# Criar em https://console.upstash.com -> Redis -> REST API
UPSTASH_REDIS_REST_URL=https://SEU_REDIS.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu_token

NEXT_PUBLIC_SITE_URL=http://localhost:3000       # em produção, a URL real do domínio
```

> Sem as variáveis do Upstash, o app roda normalmente em `pnpm dev` (cai para
> um limitador em memória com aviso no console), mas **falha ao subir com
> `NODE_ENV=production`** sem Redis configurado — de propósito, para nunca
> deixar rotas sensíveis (post, tip, comentário, login) sem proteção real em
> produção.

Para testar o webhook localmente, com a Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 5. Aplicar o schema no Supabase

```bash
# via Supabase CLI (recomendado para migrations versionadas)
pnpm add -D supabase
pnpm dlx supabase init
pnpm dlx supabase link --project-ref SEU_PROJETO_REF
pnpm dlx supabase db push   # depois de colocar supabase/schema.sql em supabase/migrations/
```

Ou cole `supabase/schema.sql` diretamente no SQL Editor do painel Supabase.

O mesmo script já cria os buckets de Storage (`post-media`, público, até 10MB
por imagem; `avatars`, público, até 2MB) com as policies de RLS de objeto —
nada a configurar manualmente no painel de Storage.

## 6. Rodar

```bash
pnpm dev
```

---

### Por que essas escolhas

- **`@supabase/ssr`** substitui o antigo `auth-helpers`: é o padrão atual para sessão via cookies `HttpOnly`, `Secure`, `SameSite=Lax`, resistente a XSS (JS não lê o cookie) e CSRF (SameSite + verificação de origem no middleware).
- **`zustand`** em vez de Context API pura: evita re-render em cascata no feed em tempo real, que vai receber eventos do Supabase Realtime a alta frequência.
- **`next-themes`**: evita o "flash" de tema errado no load (FOUC), essencial para a sensação "app nativo".
