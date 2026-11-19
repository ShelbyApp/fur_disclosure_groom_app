-- Run after 008_lookbook_inspiration.sql. Safe to rerun.
-- Restore public uploads awaiting quality review without assigning fake scores.
-- No photo visibility, rating, upload date, account or image data is changed.
begin;

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
where p.visibility='public' and (p.quality_score is null or p.quality_score>1)
  and not exists(select 1 from public.fd_lookbook_inspiration i where i.id=p.id)
union all
select i.id,i.caption,i.title as dog_name,i.breed,null::uuid as provider_id,''::text as provider_label,
  ''::text as location_label,'inspiration'::text as uploader_type,i.created_at,i.quality_score
from public.fd_lookbook_inspiration i where i.published and i.quality_score>1;
revoke all on public.fd_gallery_source from public,anon,authenticated;

-- Real public uploads lead, newest first. AI inspiration fills remaining places
-- in the same response, so importing inspiration cannot crowd out user photos.
create or replace function public.fd_gallery_featured()
returns table(id uuid,caption text,dog_name text,breed text,provider_id uuid,provider_label text,location_label text,uploader_type text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select g.id,g.caption,g.dog_name,g.breed,g.provider_id,g.provider_label,g.location_label,g.uploader_type,g.created_at
  from public.fd_gallery_source g
  order by case when g.uploader_type='inspiration' then 1 else 0 end,g.created_at desc,g.id desc
  limit 8;
$$;

-- Metadata and image access share the same visibility/quality rules. Updating
-- only the list would leave the restored cards with broken image requests.
create or replace function public.fd_gallery_image(p_photo_id uuid) returns table(image_data text)
language sql stable security definer set search_path='' as $$
  select p.image_data from public.fd_dog_photos p
  where p.id=p_photo_id and p.visibility='public' and (p.quality_score is null or p.quality_score>1)
    and not exists(select 1 from public.fd_lookbook_inspiration i where i.id=p.id)
  union all
  select i.image_data from public.fd_lookbook_inspiration i
  where i.id=p_photo_id and i.published and i.quality_score>1 limit 1;
$$;
revoke all on function public.fd_gallery_featured(),public.fd_gallery_image(uuid) from public,anon,authenticated;
grant execute on function public.fd_gallery_featured(),public.fd_gallery_image(uuid) to anon,authenticated;

-- fd_gallery_items and fd_public_lookbook already read fd_gallery_source.
-- Their date/ID pagination, role filters and location filters stay intact.
notify pgrst,'reload schema';
commit;
