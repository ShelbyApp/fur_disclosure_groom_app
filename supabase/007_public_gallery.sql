-- Run after 006_lookbook_sharing.sql. Safe to rerun. No visibility is changed.
begin;
alter table public.fd_dog_photos
  add column if not exists quality_score smallint check(quality_score between 1 and 10),
  add column if not exists uploader_type text check(uploader_type in ('owner','groomer'));

-- Keep the role at upload time, independent of later profile/metadata changes.
update public.fd_dog_photos p set uploader_type=case when u.raw_user_meta_data->>'fd_account_role'='groomer' then 'groomer' else 'owner' end
  from auth.users u where u.id=p.owner_id and p.uploader_type is null;
alter table public.fd_dog_photos alter column uploader_type set default 'owner', alter column uploader_type set not null;
create or replace function public.fd_photo_uploader_type() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select case when raw_user_meta_data->>'fd_account_role'='groomer' then 'groomer' else 'owner' end
    into new.uploader_type from auth.users where id=new.owner_id;
  new.uploader_type:=coalesce(new.uploader_type,'owner');
  return new;
end; $$;
revoke all on function public.fd_photo_uploader_type() from public,anon,authenticated;
drop trigger if exists fd_photo_uploader on public.fd_dog_photos;
create trigger fd_photo_uploader before insert on public.fd_dog_photos for each row execute function public.fd_photo_uploader_type();

-- Internal quality scores are not client-writable, including during insert.
-- Preserve the columns used by the existing groom-photo trigger and uploader.
revoke insert on public.fd_dog_photos from authenticated;
grant insert(id,owner_id,dog_id,groom_id,image_data,caption,created_at,visibility,provider_id) on public.fd_dog_photos to authenticated;

create or replace view public.fd_gallery_source as
select p.id,p.caption,d.name as dog_name,d.breed,p.provider_id,p.provider_label,
  coalesce(loc.label,'') as location_label,p.uploader_type,p.created_at,p.quality_score
from public.fd_dog_photos p
join public.fd_dogs d on d.id=p.dog_id and d.owner_id=p.owner_id
left join lateral (
  select string_agg(distinct c.name||', '||c.state,' / ' order by c.name||', '||c.state) label
  from public.fd_directory_coverage v join public.fd_directory_cities c on c.id=v.city_id
  where v.business_id=p.provider_id
) loc on true
where p.visibility='public' and p.quality_score is distinct from 1;
revoke all on public.fd_gallery_source from public,anon,authenticated;

-- Metadata only: image bytes are requested separately and recheck visibility.
create or replace function public.fd_gallery_items(p_city_id text default null,p_provider_id uuid default null,p_author text default 'all',p_before_time timestamptz default null,p_before_id uuid default null,p_photo_id uuid default null)
returns table(id uuid,caption text,dog_name text,breed text,provider_id uuid,provider_label text,location_label text,uploader_type text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if p_author is null or p_author not in ('all','owner','groomer') or (p_before_time is null)<>(p_before_id is null)
    or (p_city_id is not null and p_provider_id is not null) then raise exception 'Invalid gallery filter.' using errcode='22023'; end if;
  return query select g.id,g.caption,g.dog_name,g.breed,g.provider_id,g.provider_label,g.location_label,g.uploader_type,g.created_at
    from public.fd_gallery_source g
    where (p_author='all' or g.uploader_type=p_author)
      and (p_city_id is null or exists(select 1 from public.fd_directory_coverage c where c.business_id=g.provider_id and c.city_id=p_city_id))
      and (p_provider_id is null or g.provider_id=p_provider_id)
      and (p_photo_id is null or g.id=p_photo_id)
      and (p_before_time is null or (g.created_at,g.id)<(p_before_time,p_before_id))
    order by g.created_at desc,g.id desc limit 13;
end; $$;

-- Prefer a random selection rated 2–10; fill remaining slots from unrated public
-- photos. A score of 1 never appears on the landing page or in the gallery.
create or replace function public.fd_gallery_featured()
returns table(id uuid,caption text,dog_name text,breed text,provider_id uuid,provider_label text,location_label text,uploader_type text,created_at timestamptz)
language sql volatile security definer set search_path='' as $$
  select g.id,g.caption,g.dog_name,g.breed,g.provider_id,g.provider_label,g.location_label,g.uploader_type,g.created_at
  from public.fd_gallery_source g order by case when g.quality_score>1 then 0 else 1 end,random() limit 8;
$$;

create or replace function public.fd_gallery_image(p_photo_id uuid) returns table(image_data text)
language sql stable security definer set search_path='' as $$
  select p.image_data from public.fd_dog_photos p
  where p.id=p_photo_id and p.visibility='public' and p.quality_score is distinct from 1 limit 1;
$$;

-- Public search reveals only curated business/city labels, never owner locations.
create or replace function public.fd_gallery_locations(p_query text default '',p_kind text default null,p_id text default null)
returns table(kind text,id text,label text,detail text)
language plpgsql stable security definer set search_path='' as $$
declare terms tsquery; clean text;
begin
  if p_kind is not null and p_kind not in ('city','provider') then raise exception 'Invalid location.' using errcode='22023'; end if;
  if (p_kind is null)<>(p_id is null) then raise exception 'Invalid location.' using errcode='22023'; end if;
  clean:=regexp_replace(lower(left(coalesce(trim(p_query),''),80)),'[^a-z0-9]','','g');
  if p_id is null and length(clean)<2 then return; end if;
  select string_agg(quote_literal(t)||':*',' & ')::tsquery into terms
    from regexp_split_to_table(lower(left(coalesce(trim(p_query),''),80)),'[^a-z0-9]+') t where t<>'';
  return query select options.kind,options.id,options.label,options.detail from (
    select 'city'::text kind,c.id,c.name||', '||c.state label,'City & service area'::text detail,0 rank
    from public.fd_directory_cities c where (p_kind='city' and c.id=p_id) or (p_kind is null and (
      to_tsvector('simple',c.name||' '||c.state)@@terms or exists(select 1 from public.fd_directory_city_aliases a where a.city_id=c.id and a.alias like clean||'%')))
    union all
    select 'provider'::text,b.id::text,b.business_name,coalesce(loc.label,'Care provider'),1
    from public.fd_directory_businesses b
    left join lateral(select string_agg(distinct c.name||', '||c.state,' / ' order by c.name||', '||c.state) label
      from public.fd_directory_coverage v join public.fd_directory_cities c on c.id=v.city_id where v.business_id=b.id) loc on true
    where b.status='approved' and b.merged_into_id is null and (
      (p_kind='provider' and b.id::text=p_id) or (p_kind is null and to_tsvector('simple',concat_ws(' ',b.business_name,loc.label))@@terms))
  ) options order by options.rank,options.label,options.id limit 10;
end; $$;

-- Keep the earlier public projection consistent with quality exclusions.
create or replace function public.fd_public_lookbook(p_offset integer default 0)
returns table(id uuid,image_data text,caption text,dog_name text,breed text,provider_id uuid,provider_label text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select p.id,p.image_data,p.caption,d.name,d.breed,p.provider_id,p.provider_label,p.created_at
  from public.fd_dog_photos p join public.fd_dogs d on d.id=p.dog_id and d.owner_id=p.owner_id
  where p.visibility='public' and p.quality_score is distinct from 1 and p_offset between 0 and 10000
  order by p.created_at desc,p.id desc limit 12 offset greatest(0,least(coalesce(p_offset,0),10000));
$$;

revoke all on function public.fd_gallery_items(text,uuid,text,timestamptz,uuid,uuid),public.fd_gallery_featured(),public.fd_gallery_image(uuid),public.fd_gallery_locations(text,text,text) from public,anon,authenticated;
grant execute on function public.fd_gallery_items(text,uuid,text,timestamptz,uuid,uuid),public.fd_gallery_featured(),public.fd_gallery_image(uuid),public.fd_gallery_locations(text,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
