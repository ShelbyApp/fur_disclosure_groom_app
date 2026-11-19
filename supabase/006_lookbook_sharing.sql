-- Run after the directory deployment. Existing and groom-generated photos stay private.
begin;
alter table public.fd_dog_photos
  add column if not exists visibility text not null default 'private' check(visibility in ('private','public')),
  add column if not exists provider_id uuid references public.fd_directory_businesses(id),
  add column if not exists provider_label text not null default '';

-- Clients supply an approved directory ID; the database supplies its display name.
create or replace function public.fd_photo_provider_label() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.provider_id is null then new.provider_label:='';
  elsif tg_op='INSERT' or new.provider_id is distinct from old.provider_id then
    select business_name into new.provider_label from public.fd_directory_businesses
      where id=new.provider_id and status='approved' and merged_into_id is null;
    if not found then raise exception 'That provider is no longer available. Choose another provider or remove the tag.'; end if;
  else new.provider_label:=old.provider_label;
  end if;
  return new;
end; $$;
revoke all on function public.fd_photo_provider_label() from public,anon,authenticated;
drop trigger if exists fd_photo_provider on public.fd_dog_photos;
create trigger fd_photo_provider before insert or update on public.fd_dog_photos
for each row execute function public.fd_photo_provider_label();

grant update(caption,visibility,provider_id) on public.fd_dog_photos to authenticated;
drop policy if exists fd_photos_edit on public.fd_dog_photos;
create policy fd_photos_edit on public.fd_dog_photos for update to authenticated
  using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index if not exists fd_public_photos_timeline on public.fd_dog_photos(created_at desc,id desc) where visibility='public';

-- Compact search across ALL approved provider categories. No map, saved contact,
-- source record, rating cache or city/service filter is needed to tag a photo.
create or replace function public.fd_find_photo_providers(p_query text)
returns table(id uuid,business_name text,location_label text,services_label text)
language plpgsql stable security definer set search_path='' as $$
declare terms tsquery;
begin
  if auth.uid() is null then raise exception 'Sign in to search providers.' using errcode='42501'; end if;
  if length(regexp_replace(coalesce(trim(p_query),''),'[^a-zA-Z0-9]','','g'))<2 then return; end if;
  select string_agg(quote_literal(t)||':*',' & ')::tsquery into terms
    from regexp_split_to_table(lower(left(trim(p_query),80)),'[^a-z0-9]+') t where t<>'';
  return query select b.id,b.business_name,coalesce(loc.label,''),services.label
    from public.fd_directory_businesses b
    cross join lateral (select string_agg(distinct c.name||', '||c.state,' / ' order by c.name||', '||c.state) label
      from public.fd_directory_coverage v join public.fd_directory_cities c on c.id=v.city_id where v.business_id=b.id) loc
    cross join lateral (select concat_ws(' · ',case when b.service_flags->>'grooming'='true' then 'Grooming' end,
      case when b.location_flags->>'mobile'='true' then 'Mobile' end,
      case when b.service_flags->>'daycare'='true' then 'Daycare' end,
      case when b.service_flags->>'boarding'='true' then 'Boarding' end) label) services
    where b.status='approved' and b.merged_into_id is null
      and to_tsvector('simple',concat_ws(' ',b.business_name,loc.label,services.label))@@terms
    order by b.business_name,b.id limit 9;
end; $$;
revoke all on function public.fd_find_photo_providers(text) from public,anon,authenticated;
grant execute on function public.fd_find_photo_providers(text) to authenticated;

-- A bounded public projection for the upcoming community lookbook. Never grant
-- public access to the photo table, owner IDs, contact info, health or visit plans.
create or replace function public.fd_public_lookbook(p_offset integer default 0)
returns table(id uuid,image_data text,caption text,dog_name text,breed text,provider_id uuid,provider_label text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select p.id,p.image_data,p.caption,d.name,d.breed,p.provider_id,p.provider_label,p.created_at
  from public.fd_dog_photos p join public.fd_dogs d on d.id=p.dog_id and d.owner_id=p.owner_id
  where p.visibility='public' and p_offset between 0 and 10000
  order by p.created_at desc,p.id desc limit 12 offset greatest(0,least(coalesce(p_offset,0),10000));
$$;
revoke all on function public.fd_public_lookbook(integer) from public,anon,authenticated;
grant execute on function public.fd_public_lookbook(integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
