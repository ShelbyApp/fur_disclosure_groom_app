-- Run after 001_owner_profiles.sql in the Fur Disclosure Supabase project.
begin;
alter table public.fd_owner_profiles
  add column city text not null default '' check (length(city)<=100),
  add column state text not null default '' check (length(state)<=100);
grant update(city,state) on public.fd_owner_profiles to authenticated;

create table public.fd_groomers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.fd_owner_profiles(owner_id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  business text not null default '' check (length(business)<=180),
  address text not null default '' check (length(address)<=300),
  email text not null default '' check (length(email)<=254),
  phone text not null default '' check (length(phone)<=40),
  created_at timestamptz not null default now()
);
create index fd_groomers_owner on public.fd_groomers(owner_id);
alter table public.fd_groomers enable row level security;
revoke all on public.fd_groomers from public,anon,authenticated;
grant select,insert on public.fd_groomers to authenticated;
grant update(name,business,address,email,phone) on public.fd_groomers to authenticated;
create policy fd_groomers_read on public.fd_groomers for select to authenticated using(owner_id=(select auth.uid()));
create policy fd_groomers_add on public.fd_groomers for insert to authenticated with check(owner_id=(select auth.uid()));
create policy fd_groomers_edit on public.fd_groomers for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create table public.fd_dog_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  dog_id uuid not null,
  groom_id uuid,
  image_data text not null check (length(image_data)<=2000000 and image_data ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$'),
  image_hash text generated always as (md5(image_data)) stored,
  caption text not null default '' check(length(caption)<=120),
  created_at timestamptz not null default now(),
  foreign key(owner_id,dog_id) references public.fd_dogs(owner_id,id) on delete cascade,
  foreign key(owner_id,dog_id,groom_id) references public.fd_grooms(owner_id,dog_id,id),
  unique(owner_id,dog_id,image_hash)
);
create index fd_dog_photos_timeline on public.fd_dog_photos(owner_id,dog_id,created_at desc,id desc);
alter table public.fd_dog_photos enable row level security;
revoke all on public.fd_dog_photos from public,anon,authenticated;
grant select,insert on public.fd_dog_photos to authenticated;
create policy fd_photos_read on public.fd_dog_photos for select to authenticated using(owner_id=(select auth.uid()));
create policy fd_photos_add on public.fd_dog_photos for insert to authenticated with check(owner_id=(select auth.uid()));

-- Snapshot photos of this dog join the lookbook atomically with the finished groom.
-- The owner-provided inspiration pictures belong to the groom snapshot.
create function public.fd_add_groom_photos() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  insert into public.fd_dog_photos(owner_id,dog_id,groom_id,image_data,caption,created_at)
  select new.owner_id,new.dog_id,new.id,photo.value,
    case photo.key when 'currentFace' then 'Face' when 'currentSide' then 'Side'
      when 'currentBack' then 'Back' else 'Coat detail' end,new.created_at
  from jsonb_each_text(new.plan->'data') photo
  where photo.key in ('currentFace','currentSide','currentBack','spotPhoto')
    and length(photo.value)<=2000000
    and photo.value ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$'
  on conflict(owner_id,dog_id,image_hash) do nothing;
  return new;
end; $$;
create trigger fd_groom_photos after insert on public.fd_grooms
for each row execute function public.fd_add_groom_photos();

-- Include dog photos from visits saved before the lookbook was introduced.
insert into public.fd_dog_photos(owner_id,dog_id,groom_id,image_data,caption,created_at)
select g.owner_id,g.dog_id,g.id,photo.value,
  case photo.key when 'currentFace' then 'Face' when 'currentSide' then 'Side'
    when 'currentBack' then 'Back' else 'Coat detail' end,g.created_at
from public.fd_grooms g cross join lateral jsonb_each_text(g.plan->'data') photo
where photo.key in ('currentFace','currentSide','currentBack','spotPhoto')
  and length(photo.value)<=2000000
  and photo.value ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$'
order by g.created_at
on conflict(owner_id,dog_id,image_hash) do nothing;
notify pgrst, 'reload schema';
commit;
