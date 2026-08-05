create extension if not exists pgcrypto;

create type conversation_mode as enum ('agent', 'human');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  phone_number_id text not null,
  contact_phone text not null,
  contact_name text,
  mode conversation_mode not null default 'agent',
  assigned_operator_id uuid references public.profiles(id),
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(phone_number_id, contact_phone)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tyxter_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  author_type text not null check (author_type in ('customer', 'agent', 'human', 'system')),
  operator_id uuid references public.profiles(id),
  message_type text not null,
  text_body text,
  media_kind text,
  payload jsonb,
  metadata jsonb,
  status text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.processed_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_last_message_at_idx on public.conversations (last_message_at desc nulls last);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_occurred_at_idx on public.messages (occurred_at desc);
create index if not exists messages_tyxter_message_id_idx on public.messages (tyxter_message_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_events enable row level security;
alter table public.processed_webhook_events enable row level security;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "conversations_select_authenticated"
on public.conversations
for select
to authenticated
using (true);

create policy "messages_select_authenticated"
on public.messages
for select
to authenticated
using (true);

create policy "conversation_events_select_authenticated"
on public.conversation_events
for select
to authenticated
using (true);

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_events;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.conversation_events replica identity full;
