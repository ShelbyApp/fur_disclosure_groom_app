-- Run once in the selected project's SQL Editor. All changes are transactional.
-- An existing same-named table causes the transaction to stop for inspection.
begin;

create table public.fd_owner_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  phone text not null default '' check (length(phone) <= 40),
  created_at timestamptz not null default now()
);

create table public.fd_dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.fd_owner_profiles(owner_id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  breed text not null default '' check (length(breed) <= 180),
  birthday date,
  care_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(care_defaults) = 'object'),
  created_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table public.fd_grooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  dog_id uuid not null,
  copied_from uuid,
  service text not null check (length(service) between 1 and 180),
  visit_date date,
  plan jsonb not null check (
    jsonb_typeof(plan) = 'object' and plan ? 'data' and jsonb_typeof(plan->'data') = 'object'
    and plan ? 'date' and jsonb_typeof(plan->'date') = 'string'
  ),
  created_at timestamptz not null default now(),
  unique (owner_id, dog_id, id),
  foreign key (owner_id, dog_id) references public.fd_dogs(owner_id, id) on delete cascade,
  foreign key (owner_id, dog_id, copied_from) references public.fd_grooms(owner_id, dog_id, id),
  check (copied_from is distinct from id)
);
create index fd_grooms_dog_history on public.fd_grooms(owner_id, dog_id, created_at desc, id desc);

alter table public.fd_owner_profiles enable row level security;
alter table public.fd_dogs enable row level security;
alter table public.fd_grooms enable row level security;

revoke all on public.fd_owner_profiles, public.fd_dogs, public.fd_grooms from public, anon, authenticated;
grant select, insert on public.fd_owner_profiles, public.fd_dogs, public.fd_grooms to authenticated;
grant update (display_name, phone) on public.fd_owner_profiles to authenticated;
grant update (name, breed, birthday, care_defaults) on public.fd_dogs to authenticated;

create policy fd_profiles_read on public.fd_owner_profiles for select to authenticated using (owner_id = (select auth.uid()));
create policy fd_profiles_add on public.fd_owner_profiles for insert to authenticated with check (owner_id = (select auth.uid()));
create policy fd_profiles_edit on public.fd_owner_profiles for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fd_dogs_read on public.fd_dogs for select to authenticated using (owner_id = (select auth.uid()));
create policy fd_dogs_add on public.fd_dogs for insert to authenticated with check (owner_id = (select auth.uid()));
create policy fd_dogs_edit on public.fd_dogs for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fd_grooms_read on public.fd_grooms for select to authenticated using (owner_id = (select auth.uid()));
create policy fd_grooms_add on public.fd_grooms for insert to authenticated with check (owner_id = (select auth.uid()));

notify pgrst, 'reload schema';
commit;
