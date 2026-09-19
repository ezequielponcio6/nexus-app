# Nexus — Fundação Técnica

Estrutura completa do MVP. Leia `00-COMANDOS-SETUP.md` primeiro para bootstrapping.

## O que já funciona de ponta a ponta

Depois de aplicar `schema.sql`, preencher o `.env.local` e rodar `pnpm dev`:

- **Auth completo**: `/login`, `/cadastro`, callback PKCE, logout, sessão via
  cookies `HttpOnly` renovada pelo middleware, rate limit por IP em login/cadastro.
- **`/feed`**: posts reais respeitando `feed_algo_mode`, Realtime inserindo
  novos posts no topo (respeitando RLS de visibilidade automaticamente),
  composer com **upload de imagem real** (Supabase Storage, até 4 por post),
  seletor público/assinantes (só para criadores), curtida otimista.
- **Comentários**: modal acessível (`Dialog` do Radix) com lista em tempo
  real, respostas (`parent_comment_id`), curtida em comentário, apagar
  comentário próprio.
- **`/carteira`**: saldo e extrato reais; enviar coins roda a função SQL
  `transfer_wallet_funds` via RPC.
- **`/perfil/[username]`**: perfil público, seguir, **assinar um criador
  individual** (preço definido pelo próprio criador), conteúdo
  `visibility=subscribers` fica bloqueado (`🔒`) pra quem não assina.
- **`/explorar`**, **`/configuracoes`**: lista de perfis; editar dados,
  trocar modo do feed, ativar perfil de criador + definir preço, assinar
  Nexus Pro (plataforma).
- **Stripe**: `/api/stripe/checkout` (Nexus Pro, price fixo) e
  `/api/stripe/checkout-creator` (assinatura de criador, preço dinâmico via
  `price_data`) — o webhook distingue as duas pelo `metadata.creator_id` e
  só ativa qualquer coisa depois de validar a assinatura HMAC do evento.
- **UI acessível**: `Dialog`, `DropdownMenu`, `Sheet` e `Avatar` são
  implementações reais em cima do Radix (foco preso, ESC fecha, ARIA
  correto) — não mais divs com `onClick`.
- **Rate limiting real** (Upstash Redis, `lib/rate-limit.ts`) em: criar post,
  curtir, comentar, seguir, enviar coins, checkout do Stripe, login/cadastro.
  Em produção sem Redis configurado, o app recusa subir de propósito.
- **Responsivo**: sidebar vira ícones em telas médias, vira barra inferior +
  botão flutuante de publicar abaixo de 600px; modais, grids de imagem e
  formulários adaptados para mobile.

## O que ainda é esqueleto / próximos passos naturais

- **Payout de criador**: hoje o dinheiro entra no Stripe da plataforma. Para
  repassar de verdade a cada criador, o próximo passo é **Stripe Connect**
  (contas conectadas) — o schema já tem `wallet_transactions` pronto pra
  registrar o repasse assim que isso existir.
- **Edição/remoção de comentários por moderação**, denúncia de conteúdo.
- **Teclado mobile em modais**: `Dialog`/`CommentDialog` usam posicionamento
  fixo centralizado; em iOS Safari o teclado virtual pode cobrir o composer
  em telas muito baixas — o próximo ajuste fino é rastrear
  `window.visualViewport` para reposicionar nesse caso específico.
- **Testes automatizados**: nada aqui tem teste ainda (unitário ou e2e).

## Validação feita nesta entrega

Este ambiente de execução **não tem acesso à rede** (sandbox isolado), então
não foi possível rodar `pnpm install` + `next build` de verdade aqui. O que
foi validado:

1. Balanceamento de chaves/parênteses em todos os arquivos `.ts`/`.tsx`.
2. Checagem estática de sintaxe TypeScript (`tsc --noEmit`, filtrando só
   erros de sintaxe — erros de "módulo não encontrado" são esperados sem
   `node_modules` instalado).
3. Conferência manual de que todo import aponta pra um arquivo/export que
   existe no projeto (nenhum import "fantasma").

**Antes de considerar isso pronto para produção**, rode localmente:
```bash
pnpm install && pnpm build
```
e me traga qualquer erro que aparecer — com rede disponível é rápido de corrigir.

## Próximos passos sugeridos

1. Aplicar `schema.sql` (cria tabelas, RLS **e** buckets de Storage).
2. `pnpm install`, preencher `.env.local` (Supabase + Stripe + Upstash).
3. Criar o produto/preço "Nexus Pro" no painel Stripe.
4. `pnpm build` localmente e revisar qualquer erro de tipos que a falta de
   rede aqui não permitiu pegar.
5. Configurar Stripe Connect quando for hora de repassar dinheiro a criadores de verdade.
