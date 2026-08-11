-- ============================================================
--  BuildBruxus SaaS — Schema do Supabase
--  Rode isto no SQL Editor do Supabase (Dashboard → SQL → New query)
--  Pode rodar várias vezes com segurança (usa IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1) PROFILES  (dado público do usuário — ligado a auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free','pro','team')),
  created_at  timestamptz not null default now()
);

-- Função que cria o profile automaticamente quando o usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
  n int;
  uname text;
begin
  base := coalesce(new.raw_user_meta_data->>'username',
                   split_part(new.email, '@', 1));
  uname := base;
  n := 1;
  -- garante username único
  while exists (select 1 from public.profiles where username = uname) loop
    n := n + 1;
    uname := base || '_' || n;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, uname, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2) ROOMS  (salas de chat)
-- ============================================================
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  is_public   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists rooms_slug_idx on public.rooms (slug);

-- ============================================================
-- 3) ROOM_MEMBERS  (membership + presence state)
-- ============================================================
create table if not exists public.room_members (
  room_id     uuid references public.rooms(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  primary key (room_id, user_id)
);

-- ============================================================
-- 4) MESSAGES  (as mensagens do chat)
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

-- ============================================================
-- 5) TYPING  (indicador "digitando...")
-- ============================================================
create table if not exists public.typing (
  room_id     uuid references public.rooms(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  is_typing   boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ============================================================
-- 6) PLANS / SUBSCRIPTIONS  (integração Stripe)
-- ============================================================
create table if not exists public.plans (
  id                text primary key,            -- ex.: 'pro_monthly'
  name              text not null,
  price_cents       integer not null,
  currency          text not null default 'brl',
  interval          text not null check (interval in ('month','year')),
  stripe_price_id   text unique,
  tier              text not null check (tier in ('pro','team')),
  created_at        timestamptz not null default now()
);

-- Insere planos padrão se não existirem.
-- Substitua os stripe_price_id pelos IDs reais criados no Stripe Dashboard.
insert into public.plans (id, name, price_cents, currency, interval, stripe_price_id, tier) values
  ('pro_monthly', 'Pro Mensal',   2900, 'brl', 'month', 'price_ REPLACE_ME_PRO_MONTHLY',  'pro'),
  ('pro_yearly',  'Pro Anual',   29000, 'brl', 'year',  'price_ REPLACE_ME_PRO_YEARLY',   'pro'),
  ('team_monthly', 'Time Mensal', 7900, 'brl', 'month', 'price_ REPLACE_ME_TEAM_MONTHLY', 'team'),
  ('team_yearly',  'Time Anual',  79000, 'brl', 'year',  'price_ REPLACE_ME_TEAM_YEARLY',  'team')
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id          text,
  stripe_subscription_id      text unique,
  stripe_price_id             text,
  plan_id                     text references public.plans(id),
  status                      text not null,                -- active, past_due, canceled, trialing...
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists subs_user_idx on public.subscriptions (user_id);

-- Atualiza updated_at automaticamente
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_sub_touch on public.subscriptions;
create trigger trg_sub_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 7) ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.rooms          enable row level security;
alter table public.room_members   enable row level security;
alter table public.messages       enable row level security;
alter table public.typing         enable row level security;
alter table public.plans          enable row level security;
alter table public.subscriptions  enable row level security;

-- PROFILES
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- ROOMS
drop policy if exists "rooms_read_public" on public.rooms;
create policy "rooms_read_public" on public.rooms for select using (is_public or created_by = auth.uid());

drop policy if exists "rooms_insert_auth" on public.rooms;
create policy "rooms_insert_auth" on public.rooms for insert with check (auth.uid() is not null);

drop policy if exists "rooms_update_owner" on public.rooms;
create policy "rooms_update_owner" on public.rooms for update using (created_by = auth.uid());

drop policy if exists "rooms_delete_owner" on public.rooms;
create policy "rooms_delete_owner" on public.rooms for delete using (created_by = auth.uid());

-- ROOM_MEMBERS
drop policy if exists "rm_read_my_or_room" on public.room_members;
-- membros visíveis em salas públicas (para ver quem está online)
create policy "rm_read" on public.room_members for select
  using (
    exists (select 1 from public.rooms r
            where r.id = room_id and (r.is_public or r.created_by = auth.uid()))
  );

drop policy if exists "rm_insert_self" on public.room_members;
create policy "rm_insert_self" on public.room_members for insert with check (user_id = auth.uid());

drop policy if exists "rm_update_self" on public.room_members;
create policy "rm_update_self" on public.room_members for update using (user_id = auth.uid());

drop policy if exists "rm_delete_self" on public.room_members;
create policy "rm_delete_self" on public.room_members for delete using (user_id = auth.uid());

-- MESSAGES
drop policy if exists "messages_read" on public.messages;
create policy "messages_read" on public.messages for select
  using (
    exists (select 1 from public.rooms r
            where r.id = messages.room_id and (r.is_public or r.created_by = auth.uid()))
  );

drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self" on public.messages for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid())
  );

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages for delete using (user_id = auth.uid());

-- TYPING
drop policy if exists "typing_read" on public.typing;
create policy "typing_read" on public.typing for select
  using (
    exists (select 1 from public.rooms r
            where r.id = typing.room_id and (r.is_public or r.created_by = auth.uid()))
  );

drop policy if exists "typing_upsert_self" on public.typing;
create policy "typing_upsert_self" on public.typing for insert with check (user_id = auth.uid());
drop policy if exists "typing_update_self" on public.typing;
create policy "typing_update_self" on public.typing for update using (user_id = auth.uid());
drop policy if exists "typing_delete_self" on public.typing;
create policy "typing_delete_self" on public.typing for delete using (user_id = auth.uid());

-- PLANS (públicos para leitura)
drop policy if exists "plans_read_all" on public.plans;
create policy "plans_read_all" on public.plans for select using (true);

-- SUBSCRIPTIONS (apenas o dono vê a sua; escrita vem só via service-role no webhook)
drop policy if exists "subs_read_self" on public.subscriptions;
create policy "subs_read_self" on public.subscriptions for select using (user_id = auth.uid());

-- ============================================================
-- 8) SALAS PADRÃO
-- ============================================================
insert into public.rooms (name, slug, description, is_public)
select 'Geral',    'geral',    'Sala principal — qualquer um pode entrar', true
where not exists (select 1 from public.rooms where slug = 'geral');

insert into public.rooms (name, slug, description, is_public)
select 'Projetos', 'projetos', 'Discussão de projetos e código', true
where not exists (select 1 from public.rooms where slug = 'projetos');

insert into public.rooms (name, slug, description, is_public)
select 'Pro-only', 'pro-only', 'Sala exclusiva para membros Pro (exemplo de gating)', true
where not exists (select 1 from public.rooms where slug = 'pro-only');

-- Fim do script.