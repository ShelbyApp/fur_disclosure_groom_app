-- Apply after 003 (004 is optional). This migration is rerunnable.
-- Default policy: independent provider facts and Google Place IDs only.
-- No Google ratings, reviews or raw Places payloads are stored in this directory.
-- Standard Places terms do not grant a general 30-day rating cache or directory license.
begin;
alter table public.fd_directory_businesses
  add column if not exists data_origin text not null default 'unverified',
  add column if not exists field_provenance jsonb not null default '{}',
  add column if not exists content_license_reference text,
  add column if not exists rating_origin text,
  add column if not exists rating_license_reference text;
alter table public.fd_directory_source_records add column if not exists license_reference text;

-- Remove explicitly identified Google cache content if an earlier importer added it.
-- Independently collected provider contacts and exempt Place IDs are preserved.
update public.fd_directory_businesses set review_rating=null,review_count=null,rating_source=null,
  rating_origin=null,rating_checked_at=null,rating_valid_until=null,rating_license_reference=null
where lower(coalesce(rating_source,'')||' '||coalesce(rating_origin,'')) ~ '(google|places[ _-]?api)';
delete from public.fd_directory_source_records where lower(provider) ~ '(google|places[ _-]?api)';

alter table public.fd_directory_businesses drop constraint if exists fd_directory_data_origin;
alter table public.fd_directory_businesses add constraint fd_directory_data_origin check (
  data_origin in ('unverified','first_party_website','provider_submitted','user_submitted','licensed_third_party')
  and jsonb_typeof(field_provenance)='object'
  and (data_origin<>'licensed_third_party' or length(trim(coalesce(content_license_reference,'')))>0)
);
-- If unknown existing ratings cannot satisfy this check, the entire transaction
-- rolls back. Classify their source instead of silently relabeling them.
alter table public.fd_directory_businesses drop constraint if exists fd_directory_rating_policy;
alter table public.fd_directory_businesses add constraint fd_directory_rating_policy check (
  (review_rating is null and review_count is null and rating_source is null and rating_origin is null
    and rating_checked_at is null and rating_valid_until is null and rating_license_reference is null)
  or (review_rating is not null and review_count is not null and review_count>0 and rating_checked_at is not null and rating_origin is not null
    and length(trim(coalesce(rating_source,'')))>0 and lower(rating_source) !~ '(google|places[ _-]?api)'
    and (rating_origin='app_reviews' or (rating_origin='licensed_third_party'
      and length(trim(coalesce(rating_license_reference,'')))>0 and rating_valid_until is not null)))
);
alter table public.fd_directory_source_records drop constraint if exists fd_directory_source_policy;
alter table public.fd_directory_source_records add constraint fd_directory_source_policy check (
  provider in ('first_party_research','provider_submitted','user_submitted','licensed_third_party')
  and length(trim(retention_basis))>0
  and (provider<>'licensed_third_party' or length(trim(coalesce(license_reference,'')))>0)
);
comment on column public.fd_directory_businesses.google_place_id is 'Exempt identifier only. Storing a Place ID does not authorize Google directory content or ratings.';
comment on column public.fd_directory_businesses.review_rating is 'Own-app or independently licensed ratings only. No Google Places rating cache.';
comment on table public.fd_directory_source_records is 'Independent or explicitly licensed evidence only. Do not import Google Places responses, reviews, ratings, types, hours or photos.';

create or replace function public.fd_search_directory(p_city_id text,p_query text default '',p_service text default 'grooming',p_mode text default 'all',p_offset integer default 0)
returns table(id uuid,business_name text,address text,phone text,email text,website_url text,service_flags jsonb,location_flags jsonb,service_area text,review_rating numeric,review_count integer,rating_source text,rating_checked_at timestamptz,google_place_id text,coverage_type text)
language plpgsql stable security definer set search_path='' as $$
declare terms tsquery;
begin
  if auth.uid() is null then raise exception 'Sign in to search the directory.' using errcode='42501'; end if;
  if p_city_id is null or p_service is null or p_service not in ('grooming','daycare','boarding') or p_mode is null or p_mode not in ('all','mobile','fixed_location') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'Invalid directory search.'; end if;
  select string_agg(quote_literal(t)||':*',' & ')::tsquery into terms from regexp_split_to_table(lower(left(coalesce(p_query,''),100)),'[^a-z0-9]+') t where t<>'';
  return query select b.id,b.business_name,b.address,b.phone,b.email,b.website_url,b.service_flags,b.location_flags,b.service_area,
    case when b.rating_origin in ('app_reviews','licensed_third_party') and (b.rating_valid_until is null or b.rating_valid_until>now()) then b.review_rating end,
    case when b.rating_origin in ('app_reviews','licensed_third_party') and (b.rating_valid_until is null or b.rating_valid_until>now()) then b.review_count end,
    case when b.rating_origin in ('app_reviews','licensed_third_party') and (b.rating_valid_until is null or b.rating_valid_until>now()) then b.rating_source end,
    case when b.rating_origin in ('app_reviews','licensed_third_party') and (b.rating_valid_until is null or b.rating_valid_until>now()) then b.rating_checked_at end,
    b.google_place_id,
    (select min(c.coverage_type) from public.fd_directory_coverage c where c.business_id=b.id and c.city_id=p_city_id)
  from public.fd_directory_businesses b
  where b.status='approved' and b.merged_into_id is null and b.data_origin<>'unverified'
    and b.service_flags->p_service='true'::jsonb
    and (p_mode='all' or b.location_flags->p_mode='true'::jsonb)
    and (terms is null or b.search_document@@terms)
    and exists(select 1 from public.fd_directory_coverage c where c.city_id=p_city_id and c.business_id=b.id)
  order by b.business_name,b.id limit 21 offset p_offset;
end; $$;

create or replace function public.fd_save_directory_groomer(p_business_id uuid) returns public.fd_groomers
language plpgsql security definer set search_path='' as $$
declare b public.fd_directory_businesses; contact public.fd_groomers;
begin
  if auth.uid() is null then raise exception 'Sign in to save a groomer.' using errcode='42501'; end if;
  select * into b from public.fd_directory_businesses where id=p_business_id and status='approved' and merged_into_id is null and data_origin<>'unverified';
  if not found then raise exception 'This business is no longer available.'; end if;
  insert into public.fd_groomers(owner_id,name,business,address,email,phone,directory_business_id,entry_source)
    values(auth.uid(),'',b.business_name,b.address,b.email,b.phone,b.id,'auto_populated')
    on conflict(owner_id,directory_business_id) where directory_business_id is not null do nothing;
  select * into contact from public.fd_groomers where owner_id=auth.uid() and directory_business_id=b.id;
  return contact;
end; $$;
revoke all on function public.fd_search_directory(text,text,text,text,integer),public.fd_save_directory_groomer(uuid) from public,anon;
grant execute on function public.fd_search_directory(text,text,text,text,integer),public.fd_save_directory_groomer(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
