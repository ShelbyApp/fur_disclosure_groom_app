-- Run after 009_restore_public_uploads.sql and 010_breed_catalog.sql.
-- Safe to rerun. Existing images, visibility, ratings and dates are preserved.
begin;
alter table public.fd_dog_photos add column if not exists life_stage text not null default 'unknown'
  check (life_stage in ('unknown','puppy','adult'));
alter table public.fd_lookbook_inspiration add column if not exists life_stage text not null default 'unknown'
  check (life_stage in ('unknown','puppy','adult'));
grant update(life_stage) on public.fd_dog_photos to authenticated;
comment on column public.fd_dog_photos.life_stage is 'Uploader-supplied puppy/adult stage at the time of the photo; never inferred from appearance or current birthday.';

create or replace view public.fd_gallery_source as
select p.id,p.caption,d.name as dog_name,d.breed,p.provider_id,p.provider_label,
  coalesce(loc.label,'') as location_label,p.uploader_type,p.created_at,p.quality_score,p.life_stage
from public.fd_dog_photos p
join public.fd_dogs d on d.id=p.dog_id and d.owner_id=p.owner_id
left join lateral (
  select string_agg(distinct c.name||', '||c.state,' / ' order by c.name||', '||c.state) label
  from public.fd_directory_coverage v join public.fd_directory_cities c on c.id=v.city_id
  where v.business_id=p.provider_id
) loc on true
where p.visibility='public' and (p.quality_score is null or p.quality_score>1)
  and not exists(select 1 from public.fd_lookbook_inspiration i where i.id=p.id)
union all
select i.id,i.caption,i.title as dog_name,i.breed,null::uuid as provider_id,''::text as provider_label,
  ''::text as location_label,'inspiration'::text as uploader_type,i.created_at,i.quality_score,i.life_stage
from public.fd_lookbook_inspiration i where i.published and i.quality_score>1;
revoke all on public.fd_gallery_source from public,anon,authenticated;

-- A separate RPC preserves the original gallery contract during deployment.
-- Filter before pagination, never just the 12 visible cards.
create or replace function public.fd_gallery_search(
  p_breed text default null,p_life_stage text default 'all',
  p_city_id text default null,p_provider_id uuid default null,p_author text default 'all',
  p_before_time timestamptz default null,p_before_id uuid default null,p_photo_id uuid default null)
returns table(id uuid,caption text,dog_name text,breed text,provider_id uuid,provider_label text,
  location_label text,uploader_type text,created_at timestamptz,life_stage text)
language plpgsql stable security definer set search_path='' as $$
declare breed_query text; resolved_breed text;
begin
  if p_author is null or p_author not in ('all','owner','groomer')
    or p_life_stage is null or p_life_stage not in ('all','puppy','adult')
    or length(coalesce(p_breed,''))>180
    or (p_before_time is null)<>(p_before_id is null)
    or (p_city_id is not null and p_provider_id is not null)
    then raise exception 'Invalid gallery filter.' using errcode='22023'; end if;
  breed_query:=public.fd_breed_key(coalesce(p_breed,''));
  resolved_breed:=public.fd_resolve_breed(p_breed);
  if trim(coalesce(p_breed,''))<>'' and breed_query='' then
    raise exception 'Enter a breed name.' using errcode='22023';
  end if;
  return query select g.id,g.caption,g.dog_name,g.breed,g.provider_id,g.provider_label,
    g.location_label,g.uploader_type,g.created_at,g.life_stage
    from public.fd_gallery_source g
    where (breed_query='' or public.fd_resolve_breed(g.breed)=resolved_breed
      or strpos(public.fd_breed_key(g.breed),breed_query)>0)
      and (p_life_stage='all' or g.life_stage=p_life_stage)
      and (p_author='all' or g.uploader_type=p_author)
      and (p_city_id is null or exists(select 1 from public.fd_directory_coverage c where c.business_id=g.provider_id and c.city_id=p_city_id))
      and (p_provider_id is null or g.provider_id=p_provider_id)
      and (p_photo_id is null or g.id=p_photo_id)
      and (p_before_time is null or (g.created_at,g.id)<(p_before_time,p_before_id))
    order by g.created_at desc,g.id desc limit 13;
end $$;
revoke all on function public.fd_gallery_search(text,text,text,uuid,text,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fd_gallery_search(text,text,text,uuid,text,timestamptz,uuid,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;

select count(*) as breed_count from public.fd_breeds;
select life_stage,count(*) as public_photos from public.fd_gallery_source group by life_stage;
