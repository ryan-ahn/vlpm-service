create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null check (role in ('customer', 'partner')),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product text not null,
  brand text not null,
  budget text not null,
  memo text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  price text not null,
  message text,
  created_at timestamptz not null default now(),
  unique (request_id, partner_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, partner_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.estimates enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.requests to authenticated;
grant select, insert, update on public.estimates to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests
  for select to authenticated using (true);
drop policy if exists "requests_insert" on public.requests;
create policy "requests_insert" on public.requests
  for insert to authenticated with check (customer_id = auth.uid());
drop policy if exists "requests_update" on public.requests;
create policy "requests_update" on public.requests
  for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists "estimates_select" on public.estimates;
create policy "estimates_select" on public.estimates
  for select to authenticated using (true);
drop policy if exists "estimates_insert" on public.estimates;
create policy "estimates_insert" on public.estimates
  for insert to authenticated with check (partner_id = auth.uid());
drop policy if exists "estimates_update" on public.estimates;
create policy "estimates_update" on public.estimates
  for update to authenticated using (partner_id = auth.uid()) with check (partner_id = auth.uid());

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select to authenticated
  using (customer_id = auth.uid() or partner_id = auth.uid());
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert to authenticated
  with check (customer_id = auth.uid() or partner_id = auth.uid());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.partner_id = auth.uid())
    )
  );
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.partner_id = auth.uid())
    )
  );

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
