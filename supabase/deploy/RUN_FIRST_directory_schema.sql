-- RUN FIRST in the Supabase SQL Editor for zdpheikochvtjirgskuv.
-- Requires existing owner-profile migrations 001 and 002. Safe to rerun.
-- Adds directory structures when absent and applies the storage-policy update.
-- Does not insert providers, edit owner/dog records or enable Google billing.
begin;
select pg_advisory_xact_lock(170118003);
do $fd_setup$
begin
  if to_regclass('public.fd_groomers') is null or to_regclass('public.fd_owner_profiles') is null then
    raise exception 'Run the existing Fur Disclosure migrations 001 and 002 first. No changes were applied.';
  end if;
  if to_regclass('public.fd_directory_businesses') is null then
    execute $fd_install$
-- Apply after 002. Shared businesses are curated; owner contacts remain private.
create function public.fd_valid_flags(value jsonb, keys text[]) returns boolean
language sql immutable set search_path='' as $$
  select jsonb_typeof(value)='object' and value ?& keys
    and not exists(select 1 from jsonb_each(value) e where not(e.key=any(keys)) or jsonb_typeof(e.value) not in ('boolean','null'));
$$;
create table public.fd_directory_cities (
  id text primary key, name text not null, state text not null, country text not null default 'US'
);
create table public.fd_directory_city_aliases (
  alias text not null, city_id text not null references public.fd_directory_cities(id), primary key(alias,city_id)
);
create index fd_city_alias_prefix on public.fd_directory_city_aliases(alias text_pattern_ops);
create table public.fd_directory_businesses (
  id uuid primary key default gen_random_uuid(), seed_key text unique,
  business_name text not null check(length(trim(business_name)) between 1 and 180),
  address text not null default '' check(length(address)<=300),
  phone text not null default '' check(length(phone)<=40),
  email text not null default '' check(length(email)<=254),
  website_url text not null default '' check(length(website_url)<=2000 and (website_url='' or website_url ~ '^https?://')),
  service_flags jsonb not null default '{"grooming":null,"daycare":null,"boarding":null}'
    check(public.fd_valid_flags(service_flags,array['grooming','daycare','boarding'])),
  location_flags jsonb not null default '{"fixed_location":null,"mobile":null}'
    check(public.fd_valid_flags(location_flags,array['fixed_location','mobile'])),
  service_area text not null default '' check(length(service_area)<=1000),
  show_level_cuts boolean, languages_spoken text[],
  entry_source text not null check(entry_source in ('auto_populated','user_entered')),
  status text not null default 'pending' check(status in ('pending','approved','merged','inactive')),
  merged_into_id uuid references public.fd_directory_businesses(id) check(merged_into_id<>id),
  google_place_id text unique,
  review_rating numeric(2,1) check(review_rating between 1.0 and 5.0),
  review_count integer check(review_count>=0), rating_source text, rating_checked_at timestamptz,
  rating_valid_until timestamptz,
  source_urls jsonb not null default '[]' check(jsonb_typeof(source_urls)='array'),
  verified_at timestamptz,
  search_document tsvector generated always as (to_tsvector('simple',business_name)) stored,
  name_key text generated always as (regexp_replace(lower(business_name),'[^a-z0-9]','','g')) stored,
  phone_key text generated always as (right(regexp_replace(phone,'[^0-9]','','g'),10)) stored,
  created_at timestamptz not null default now()
);
create index fd_directory_name_search on public.fd_directory_businesses using gin(search_document);
create index fd_directory_name_key on public.fd_directory_businesses(name_key);
create index fd_directory_phone_key on public.fd_directory_businesses(phone_key) where phone_key<>'';
create table public.fd_directory_coverage (
  business_id uuid not null references public.fd_directory_businesses(id),
  city_id text not null references public.fd_directory_cities(id),
  coverage_type text not null check(coverage_type in ('storefront','service_area','nearby')),
  evidence_url text not null default '',
  primary key(city_id,business_id,coverage_type)
);
create index fd_coverage_business on public.fd_directory_coverage(business_id);
-- Provider attributes are isolated from app search. Ingestion must set an allowed
-- retention policy; a JSONB column does not authorize indefinite Google caching.
create table public.fd_directory_source_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.fd_directory_businesses(id),
  provider text not null, observed_at timestamptz not null, expires_at timestamptz,
  retention_basis text not null, attributes jsonb not null check(jsonb_typeof(attributes)='object')
);
create index fd_source_expiry on public.fd_directory_source_records(expires_at);

alter table public.fd_groomers drop constraint fd_groomers_name_check;
alter table public.fd_groomers add constraint fd_groomers_contact_name check(length(name)<=100 and length(trim(name||business))>0);
alter table public.fd_groomers add column directory_business_id uuid references public.fd_directory_businesses(id),
  add column entry_source text not null default 'user_entered' check(entry_source in ('user_entered','auto_populated'));
create unique index fd_saved_directory_once on public.fd_groomers(owner_id,directory_business_id) where directory_business_id is not null;
-- Legacy/manual inserts cannot forge provenance or directory linkage.
revoke insert on public.fd_groomers from authenticated;
grant insert(id,owner_id,name,business,address,email,phone) on public.fd_groomers to authenticated;

create table public.fd_directory_submissions (
  id uuid primary key references public.fd_groomers(id) on delete cascade,
  owner_id uuid not null references public.fd_owner_profiles(owner_id) on delete cascade,
  city_id text references public.fd_directory_cities(id), city_text text not null check(length(city_text) between 1 and 100),
  proposed jsonb not null, entry_source text not null default 'user_entered' check(entry_source='user_entered'),
  review_status text not null default 'pending' check(review_status in ('pending','approved','duplicate','rejected')),
  duplicate_candidate_ids uuid[] not null default '{}',
  duplicate_submission_ids uuid[] not null default '{}',
  name_key text generated always as (regexp_replace(lower(coalesce(nullif(proposed->>'business',''),proposed->>'name')),'[^a-z0-9]','','g')) stored,
  phone_key text generated always as (right(regexp_replace(proposed->>'phone','[^0-9]','','g'),10)) stored,
  canonical_business_id uuid references public.fd_directory_businesses(id),
  created_at timestamptz not null default now()
);
create index fd_submission_review on public.fd_directory_submissions(review_status,created_at);
create index fd_submission_name on public.fd_directory_submissions(name_key,city_id);
create index fd_submission_phone on public.fd_directory_submissions(phone_key) where phone_key<>'';
alter table public.fd_directory_cities enable row level security;
alter table public.fd_directory_city_aliases enable row level security;
alter table public.fd_directory_businesses enable row level security;
alter table public.fd_directory_coverage enable row level security;
alter table public.fd_directory_source_records enable row level security;
alter table public.fd_directory_submissions enable row level security;
revoke all on public.fd_directory_cities,public.fd_directory_city_aliases,public.fd_directory_businesses,public.fd_directory_coverage,public.fd_directory_source_records,public.fd_directory_submissions from public,anon,authenticated;
-- Only bounded RPCs expose directory data. Source records and the review queue
-- have no browser grants; personal contacts keep their existing owner RLS.

create function public.fd_find_directory_cities(p_query text) returns setof public.fd_directory_cities
language sql stable security definer set search_path='' as $$
  select c.* from public.fd_directory_cities c where auth.uid() is not null
  and length(regexp_replace(lower(trim(p_query)),'[^a-z0-9]','','g'))>=2
  and exists(select 1 from public.fd_directory_city_aliases a where a.city_id=c.id
    and a.alias like regexp_replace(lower(left(trim(p_query),100)),'[^a-z0-9]','','g')||'%')
  order by c.name,c.id limit 10;
$$;
create function public.fd_search_directory(p_city_id text,p_query text default '',p_service text default 'grooming',p_mode text default 'all',p_offset integer default 0)
returns table(id uuid,business_name text,address text,phone text,email text,website_url text,service_flags jsonb,location_flags jsonb,service_area text,review_rating numeric,review_count integer,rating_source text,rating_checked_at timestamptz,google_place_id text,coverage_type text)
language plpgsql stable security definer set search_path='' as $$
declare terms tsquery;
begin
  if auth.uid() is null then raise exception 'Sign in to search the directory.' using errcode='42501'; end if;
  if p_city_id is null or p_service not in ('grooming','daycare','boarding') or p_mode not in ('all','mobile','fixed_location') or p_offset is null or p_offset<0 or p_offset>10000 then raise exception 'Invalid directory search.'; end if;
  select string_agg(quote_literal(t)||':*',' & ')::tsquery into terms from regexp_split_to_table(lower(left(coalesce(p_query,''),100)),'[^a-z0-9]+') t where t<>'';
  return query select b.id,b.business_name,b.address,b.phone,b.email,b.website_url,b.service_flags,b.location_flags,b.service_area,
    case when b.rating_valid_until>now() then b.review_rating end,
    case when b.rating_valid_until>now() then b.review_count end,
    b.rating_source,b.rating_checked_at,b.google_place_id,
    (select min(c.coverage_type) from public.fd_directory_coverage c where c.business_id=b.id and c.city_id=p_city_id)
  from public.fd_directory_businesses b
  where b.status='approved' and b.merged_into_id is null and b.service_flags->p_service='true'::jsonb
    and (p_mode='all' or b.location_flags->p_mode='true'::jsonb)
    and (terms is null or b.search_document@@terms)
    and exists(select 1 from public.fd_directory_coverage c where c.city_id=p_city_id and c.business_id=b.id)
  order by b.business_name,b.id limit 21 offset p_offset;
end; $$;

create function public.fd_save_directory_groomer(p_business_id uuid) returns public.fd_groomers
language plpgsql security definer set search_path='' as $$
declare b public.fd_directory_businesses; contact public.fd_groomers;
begin
  if auth.uid() is null then raise exception 'Sign in to save a groomer.' using errcode='42501'; end if;
  select * into b from public.fd_directory_businesses where id=p_business_id and status='approved' and merged_into_id is null;
  if not found then raise exception 'This business is no longer available.'; end if;
  insert into public.fd_groomers(owner_id,name,business,address,email,phone,directory_business_id,entry_source)
    values(auth.uid(),'',b.business_name,b.address,b.email,b.phone,b.id,'auto_populated')
    on conflict(owner_id,directory_business_id) where directory_business_id is not null do nothing;
  select * into contact from public.fd_groomers where owner_id=auth.uid() and directory_business_id=b.id;
  return contact;
end; $$;

create function public.fd_submit_directory_groomer(p_contact_id uuid,p_contact jsonb,p_city_id text,p_city_text text,p_services jsonb,p_locations jsonb,p_service_area text default '') returns public.fd_groomers
language plpgsql security definer set search_path='' as $$
declare contact public.fd_groomers; candidates uuid[]; submissions uuid[]; resolved_city text:=p_city_id;
begin
  if auth.uid() is null then raise exception 'Sign in to add a groomer.' using errcode='42501'; end if;
  if p_services is null or p_locations is null or not public.fd_valid_flags(p_services,array['grooming','daycare','boarding']) or not public.fd_valid_flags(p_locations,array['fixed_location','mobile'])
    or length(coalesce(trim(p_city_text),'')) not between 1 and 100 or length(coalesce(p_service_area,''))>1000
    then raise exception 'Enter a city and valid service details.'; end if;
  if resolved_city is null then
    select case when count(distinct a.city_id)=1 then min(a.city_id) end into resolved_city
      from public.fd_directory_city_aliases a where a.alias=regexp_replace(lower(trim(p_city_text)),'[^a-z0-9]','','g');
  end if;
  select * into contact from public.fd_groomers where id=p_contact_id;
  if found then
    if contact.owner_id<>auth.uid() then raise exception 'Contact unavailable.' using errcode='42501'; end if;
    if exists(select 1 from public.fd_directory_submissions where id=p_contact_id) then return contact; end if;
    raise exception 'Use a new contact ID.';
  end if;
  insert into public.fd_groomers(id,owner_id,name,business,address,email,phone)
    values(p_contact_id,auth.uid(),coalesce(trim(p_contact->>'name'),''),coalesce(trim(p_contact->>'business'),''),coalesce(trim(p_contact->>'address'),''),coalesce(trim(p_contact->>'email'),''),coalesce(trim(p_contact->>'phone'),'')) returning * into contact;
  select coalesce(array_agg(matches.id),'{}') into candidates from (
    select b.id from public.fd_directory_businesses b where b.status='approved' and b.merged_into_id is null and (
      (length(b.phone_key)=10 and b.phone_key=right(regexp_replace(contact.phone,'[^0-9]','','g'),10))
      or (b.name_key=regexp_replace(lower(coalesce(nullif(contact.business,''),contact.name)),'[^a-z0-9]','','g')
        and exists(select 1 from public.fd_directory_coverage c where c.business_id=b.id and c.city_id=resolved_city)))
    order by b.id limit 20) matches;
  select coalesce(array_agg(matches.id),'{}') into submissions from (
    select s.id from public.fd_directory_submissions s where s.review_status='pending' and (
      (length(s.phone_key)=10 and s.phone_key=right(regexp_replace(contact.phone,'[^0-9]','','g'),10))
      or (s.name_key=regexp_replace(lower(coalesce(nullif(contact.business,''),contact.name)),'[^a-z0-9]','','g')
        and (s.city_id=resolved_city or lower(trim(s.city_text))=lower(trim(p_city_text)))))
    order by s.id limit 20) matches;
  insert into public.fd_directory_submissions(id,owner_id,city_id,city_text,proposed,duplicate_candidate_ids,duplicate_submission_ids)
    values(contact.id,auth.uid(),resolved_city,trim(p_city_text),jsonb_build_object('name',contact.name,'business',contact.business,'address',contact.address,'email',contact.email,'phone',contact.phone,'service_flags',p_services,'location_flags',p_locations,'service_area',coalesce(p_service_area,'')),candidates,submissions);
  return contact;
end; $$;
revoke all on function public.fd_valid_flags(jsonb,text[]),public.fd_find_directory_cities(text),public.fd_search_directory(text,text,text,text,integer),public.fd_save_directory_groomer(uuid),public.fd_submit_directory_groomer(uuid,jsonb,text,text,jsonb,jsonb,text) from public,anon;
grant execute on function public.fd_valid_flags(jsonb,text[]),public.fd_find_directory_cities(text),public.fd_search_directory(text,text,text,text,integer),public.fd_save_directory_groomer(uuid),public.fd_submit_directory_groomer(uuid,jsonb,text,text,jsonb,jsonb,text) to authenticated;

$fd_install$;
  elsif to_regclass('public.fd_directory_coverage') is null or to_regclass('public.fd_directory_source_records') is null or to_regclass('public.fd_directory_submissions') is null then
    raise exception 'Partial directory installation detected. Inspect the existing schema before continuing.';
  end if;
end;
$fd_setup$;
-- Apply after 003 (004 is optional). This migration is rerunnable.
-- Default policy: independent provider facts and Google Place IDs only.
-- No Google ratings, reviews or raw Places payloads are stored in this directory.
-- Standard Places terms do not grant a general 30-day rating cache or directory license.
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
select 'Directory schema ready; provider import can run next.' as result;
