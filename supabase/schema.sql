-- =========================================================================
-- NEXUS — SCHEMA INICIAL
-- Rede social: feed híbrido, wallet de criador, assinaturas Stripe, RLS estrita
-- Postgres 15 / Supabase
-- =========================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- busca fuzzy de username/bio
create extension if not exists "citext";         -- username case-insensitive

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type post_visibility as enum ('public', 'followers', 'subscribers', 'private');
create type wallet_tx_type as enum ('credit_purchase', 'tip_sent', 'tip_received',
                                     'creator_payout', 'refund', 'subscription_reward');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type feed_algo_mode as enum ('chronological', 'balanced', 'discovery');

-- ---------------------------------------------------------------------
-- PROFILES
-- Estende auth.users (nunca duplicar e-mail/senha aqui)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            citext not null unique,
  display_name        text not null,
  avatar_url          text,
  bio                 text check (char_length(bio) <= 280),
  is_verified         boolean not null default false,
  is_creator          boolean not null default false,

  -- Monetização
  premium_tier        text not null default 'free',        -- 'free' | 'pro' | 'creator_plus'
  stripe_customer_id  text unique,

  -- Preço mensal (em centavos, BRL) que este criador cobra pela própria
  -- assinatura. NULL = este usuário não vende assinatura individual.
  creator_subscription_price_cents integer check (creator_subscription_price_cents is null or creator_subscription_price_cents >= 500),

  -- Preferência de feed (controle devolvido ao usuário)
  feed_algo_mode      feed_algo_mode not null default 'balanced',

  followers_count     integer not null default 0,
  following_count     integer not null default 0,
  posts_count         integer not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.profiles.feed_algo_mode is
  'Controle explícito do usuário sobre a ordenação do próprio feed — anti "caixa preta".';


create index idx_profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);
create index idx_profiles_stripe_customer on public.profiles (stripe_customer_id);

-- ---------------------------------------------------------------------
-- POSTS
-- ---------------------------------------------------------------------
create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  content         text check (char_length(content) <= 3000),
  media_urls      text[] not null default '{}',
  visibility      post_visibility not null default 'public',

  -- Requer assinatura ativa do autor para ver (monetização de conteúdo)
  is_premium_content boolean not null default false,

  likes_count     integer not null default 0,
  comments_count  integer not null default 0,
  reposts_count   integer not null default 0,

  -- deletar sem perder integridade referencial do feed (soft delete)
  deleted_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Índice central do feed: paginação por tempo, filtrando autor e visibilidade
create index idx_posts_feed_chronological on public.posts (created_at desc)
  where deleted_at is null;
create index idx_posts_author on public.posts (author_id, created_at desc)
  where deleted_at is null;
create index idx_posts_engagement on public.posts (likes_count desc, created_at desc)
  where deleted_at is null;  -- suporta o modo "discovery"

-- ---------------------------------------------------------------------
-- COMMENTS (com suporte a threads)
-- ---------------------------------------------------------------------
create table public.comments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.posts(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id  uuid references public.comments(id) on delete cascade,
  content            text not null check (char_length(content) <= 1000),
  likes_count        integer not null default 0,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now()
);

create index idx_comments_post on public.comments (post_id, created_at asc)
  where deleted_at is null;
create index idx_comments_parent on public.comments (parent_comment_id);

-- ---------------------------------------------------------------------
-- LIKES (posts e comentários)
-- ---------------------------------------------------------------------
create table public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid references public.posts(id) on delete cascade,
  comment_id  uuid references public.comments(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint likes_unique_post unique (user_id, post_id),
  constraint likes_unique_comment unique (user_id, comment_id)
);

create index idx_likes_post on public.likes (post_id);
create index idx_likes_comment on public.likes (comment_id);

-- ---------------------------------------------------------------------
-- MESSAGES — mensagens diretas persistentes entre usuários
-- ---------------------------------------------------------------------
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  receiver_id  uuid not null references public.profiles(id) on delete cascade,
  content      text,
  media_url    text,
  created_at   timestamptz not null default now(),
  constraint messages_content_check check (content is not null or media_url is not null),
  constraint messages_no_self check (sender_id <> receiver_id)
);

create index idx_messages_conversation on public.messages (sender_id, receiver_id, created_at asc);
alter table public.messages enable row level security;

create policy "messages_participants_select" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages_sender_insert" on public.messages
  for insert with check (auth.uid() = sender_id);

alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- FOLLOWS
-- ---------------------------------------------------------------------
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index idx_follows_following on public.follows (following_id);
create index idx_follows_follower on public.follows (follower_id);

-- ---------------------------------------------------------------------
-- WALLET — carteira interna de moedas/pontos do criador
-- Saldo nunca é escrito diretamente pelo cliente: só via função SECURITY DEFINER
-- ---------------------------------------------------------------------
create table public.wallets (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  balance      bigint not null default 0 check (balance >= 0),   -- em "centavos de moeda" (integer, evita float)
  updated_at   timestamptz not null default now()
);

create table public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  wallet_id     uuid not null references public.wallets(user_id) on delete cascade,
  amount        bigint not null,                 -- positivo = crédito, negativo = débito
  type          wallet_tx_type not null,
  reference_id  uuid,                             -- ex: id do post que recebeu a gorjeta
  counterparty_id uuid references public.profiles(id),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index idx_wallet_tx_wallet on public.wallet_transactions (wallet_id, created_at desc);

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS — assinaturas Stripe (plataforma e criador-para-criador)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  subscriber_id           uuid not null references public.profiles(id) on delete cascade,
  -- null = assinatura da plataforma (Nexus Pro); preenchido = assinatura de um criador
  creator_id              uuid references public.profiles(id) on delete cascade,

  stripe_subscription_id  text unique not null,
  stripe_price_id         text not null,
  status                  subscription_status not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint no_self_subscription check (subscriber_id <> creator_id)
);

create index idx_subs_subscriber on public.subscriptions (subscriber_id);
create index idx_subs_creator on public.subscriptions (creator_id) where creator_id is not null;
create unique index idx_subs_active_unique on public.subscriptions (subscriber_id, coalesce(creator_id, '00000000-0000-0000-0000-000000000000'))
  where status in ('active', 'trialing');

-- =========================================================================
-- TRIGGERS — contadores desnormalizados (evita COUNT(*) caro em feed de milhões)
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, 'user_' || substr(new.id::text, 1, 8), coalesce(new.raw_user_meta_data->>'display_name', 'Novo usuário'));

  insert into public.wallets (user_id, balance) values (new.id, 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_posts_updated_at before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.touch_updated_at();

create or replace function public.handle_follow_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger trg_follow_counts
  after insert or delete on public.follows
  for each row execute function public.handle_follow_counts();

create or replace function public.handle_like_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.post_id is not null then
      update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    else
      update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.post_id is not null then
      update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    else
      update public.comments set likes_count = greatest(0, likes_count - 1) where id = old.comment_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger trg_like_counts
  after insert or delete on public.likes
  for each row execute function public.handle_like_counts();

create or replace function public.handle_post_comment_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_post_comment_counts
  after insert or delete on public.comments
  for each row execute function public.handle_post_comment_counts();

-- =========================================================================
-- FUNÇÃO SEGURA DE TRANSAÇÃO DE WALLET
-- Única forma permitida de alterar saldo — atômica, valida saldo, registra ledger.
-- Chamada via RPC (supabase.rpc), nunca via UPDATE direto do client.
-- =========================================================================
create or replace function public.transfer_wallet_funds(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_amount bigint,
  p_type wallet_tx_type,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_balance bigint;
begin
  if p_amount <= 0 then
    raise exception 'Valor da transação deve ser positivo';
  end if;

  if p_sender_id <> auth.uid() then
    raise exception 'Não autorizado: remetente deve ser o usuário autenticado';
  end if;

  -- Lock pessimista evita condição de corrida em envios simultâneos
  select balance into v_sender_balance from public.wallets where user_id = p_sender_id for update;

  if v_sender_balance is null then
    raise exception 'Carteira do remetente não encontrada';
  end if;

  if v_sender_balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = p_sender_id;
  update public.wallets set balance = balance + p_amount, updated_at = now() where user_id = p_receiver_id;

  insert into public.wallet_transactions (wallet_id, amount, type, reference_id, counterparty_id)
  values (p_sender_id, -p_amount, p_type, p_reference_id, p_receiver_id);

  insert into public.wallet_transactions (wallet_id, amount, type, reference_id, counterparty_id)
  values (p_receiver_id, p_amount, p_type, p_reference_id, p_sender_id);
end;
$$;

revoke execute on function public.transfer_wallet_funds from public;
grant execute on function public.transfer_wallet_funds to authenticated;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.subscriptions enable row level security;

-- --- PROFILES ---
create policy "profiles_select_public" on public.profiles
  for select using (true);                          -- perfis são públicos por natureza

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Ninguém insere profiles manualmente — só o trigger handle_new_user (security definer)
-- Nenhuma policy de insert/delete para authenticated = bloqueado por padrão.

-- --- POSTS ---
create policy "posts_select_visibility" on public.posts
  for select using (
    deleted_at is null and (
      visibility = 'public'
      or author_id = auth.uid()
      or (visibility = 'followers' and exists (
            select 1 from public.follows
            where follower_id = auth.uid() and following_id = author_id))
      or (visibility = 'subscribers' and exists (
            select 1 from public.subscriptions
            where subscriber_id = auth.uid() and creator_id = author_id and status = 'active'))
    )
  );

create policy "posts_insert_own" on public.posts
  for insert with check (author_id = auth.uid());

create policy "posts_update_own" on public.posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "posts_delete_own" on public.posts
  for delete using (author_id = auth.uid());

-- --- COMMENTS ---
create policy "comments_select_if_post_visible" on public.comments
  for select using (
    deleted_at is null and exists (
      select 1 from public.posts p where p.id = post_id
      -- reaproveita a mesma regra de visibilidade do post via join implícito na policy de posts
    )
  );

create policy "comments_insert_own" on public.comments
  for insert with check (author_id = auth.uid());

create policy "comments_update_own" on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "comments_delete_own" on public.comments
  for delete using (author_id = auth.uid());

-- --- LIKES ---
create policy "likes_select_all" on public.likes for select using (true);

create policy "likes_insert_own" on public.likes
  for insert with check (user_id = auth.uid());

create policy "likes_delete_own" on public.likes
  for delete using (user_id = auth.uid());

-- --- FOLLOWS ---
create policy "follows_select_all" on public.follows for select using (true);

create policy "follows_insert_own" on public.follows
  for insert with check (follower_id = auth.uid());

create policy "follows_delete_own" on public.follows
  for delete using (follower_id = auth.uid());

-- --- WALLETS (blindagem máxima: só o dono vê o saldo, ninguém escreve direto) ---
create policy "wallets_select_own" on public.wallets
  for select using (user_id = auth.uid());

-- Sem policy de insert/update/delete para authenticated: toda escrita passa
-- pela função transfer_wallet_funds (security definer) ou pelo service_role (webhooks Stripe).

-- --- WALLET TRANSACTIONS (extrato) ---
create policy "wallet_tx_select_own" on public.wallet_transactions
  for select using (wallet_id = auth.uid());

-- Sem insert/update/delete para authenticated: só via função segura acima.

-- --- SUBSCRIPTIONS ---
create policy "subscriptions_select_own" on public.subscriptions
  for select using (subscriber_id = auth.uid() or creator_id = auth.uid());

-- Inserts/updates de assinatura só via service_role (webhook do Stripe confirma pagamento
-- antes de liberar acesso) — nunca confiar no client para "criar" uma assinatura ativa.

-- =========================================================================
-- REALTIME — expõe as tabelas do feed para Supabase Realtime
-- =========================================================================
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.likes;

-- =========================================================================
-- STORAGE — upload de mídia (posts) e avatares
-- Estrutura de path obrigatória: {user_id}/{arquivo} — é o que a policy
-- usa para garantir que cada usuário só escreve dentro da própria pasta.
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-media', 'post-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "post_media_public_read" on storage.objects
  for select using (bucket_id = 'post-media');

create policy "post_media_own_folder_insert" on storage.objects
  for insert with check (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post_media_own_folder_delete" on storage.objects
  for delete using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_folder_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_own_folder_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_own_folder_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================================================================
-- Índice extra: assinaturas ativas de um criador específico (para o botão
-- "Assinar" no perfil resolver rápido se o visitante já é assinante).
-- =========================================================================
create index idx_subs_creator_subscriber_active on public.subscriptions (creator_id, subscriber_id)
  where status in ('active', 'trialing');
