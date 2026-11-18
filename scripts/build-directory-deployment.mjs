// Offline packaging only: no API requests and no database credentials.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=new URL('../supabase/data/providers.json',import.meta.url);
const root=new URL('../',import.meta.url),out=new URL('../supabase/deploy/',import.meta.url);
await mkdir(out,{recursive:true});
const researched=JSON.parse(await readFile(source,'utf8'));
const fields=['id','seed_key','business_name','address','phone','email','website_url','service_flags','location_flags','service_area','show_level_cuts','languages_spoken','entry_source','google_place_id','source_urls'];
const records=researched.map(r=>{
  const row=Object.fromEntries(fields.map(k=>[k,r[k]??null]));
  assert.equal(r.data_origin,'first_party_website');
  assert.ok(r.field_provenance?.business_name?.source_urls?.length);
  row.data_origin=r.data_origin;
  row.field_provenance=r.field_provenance;
  row.service_city_ids=r.service_city_ids;row.coverage_type=r.coverage_type;
  return row;
});
assert.equal(records.length,41);
assert.equal(new Set(records.map(r=>r.id)).size,records.length);
for(const row of records){assert.ok(row.source_urls.length);assert.ok(row.source_urls.every(u=>/^https?:\/\//.test(u)&&!/(google|maps\.app)/i.test(new URL(u).hostname)));}
await writeFile(new URL('providers-for-import.json',out),JSON.stringify(records,null,2)+'\n');
const stripTransaction=sql=>sql.replace(/^begin;\s*/m,'').replace(/commit;\s*$/,'');
const base=stripTransaction(await readFile(new URL('supabase/003_service_directory.sql',root),'utf8'));
const policy=stripTransaction(await readFile(new URL('supabase/005_directory_storage_policy.sql',root),'utf8'));
const schema=`-- RUN FIRST in the Supabase SQL Editor for zdpheikochvtjirgskuv.\n-- Requires existing owner-profile migrations 001 and 002. Safe to rerun.\n-- Adds directory structures when absent and applies the storage-policy update.\n-- Does not insert providers, edit owner/dog records or enable Google billing.\nbegin;\nselect pg_advisory_xact_lock(170118003);\ndo $fd_setup$\nbegin\n  if to_regclass('public.fd_groomers') is null or to_regclass('public.fd_owner_profiles') is null then\n    raise exception 'Run the existing Fur Disclosure migrations 001 and 002 first. No changes were applied.';\n  end if;\n  if to_regclass('public.fd_directory_businesses') is null then\n    execute $fd_install$\n${base}\n$fd_install$;\n  elsif to_regclass('public.fd_directory_coverage') is null or to_regclass('public.fd_directory_source_records') is null or to_regclass('public.fd_directory_submissions') is null then\n    raise exception 'Partial directory installation detected. Inspect the existing schema before continuing.';\n  end if;\nend;\n$fd_setup$;\n${policy}\ncommit;\nselect 'Directory schema ready; provider import can run next.' as result;\n`;
await writeFile(new URL('RUN_FIRST_directory_schema.sql',out),schema);
const quote=v=>v==null?'null':"'"+String(v).replaceAll("'","''")+"'";
const json=v=>quote(JSON.stringify(v))+'::jsonb';
const cities=[['sarasota-fl','Sarasota',['sarasota','sarasotafl','sarasotaflorida']],['st-petersburg-fl','St. Petersburg',['stpetersburg','stpetersburgfl','stpetersburgflorida','saintpetersburg','saintpetersburgfl','stpete','stpetefl']],['tampa-fl','Tampa',['tampa','tampafl','tampaflorida']]];
let sql=`-- RUN SECOND, or let Codex execute this after the Supabase connection is ready.\n-- 41 independently researched providers, 44 city associations, 40 exempt Place IDs.\n-- No Google ratings, reviews, business types, hours, photos or raw payloads.\n-- Rerunnable; existing provider/contact edits are preserved.\nbegin;\nselect pg_advisory_xact_lock(170118003);\ndo $fd_import$\nbegin\n  if not exists(select 1 from pg_constraint where conname='fd_directory_source_policy' and conrelid='public.fd_directory_source_records'::regclass) then\n    raise exception 'Run RUN_FIRST_directory_schema.sql before importing providers.';\n  end if;\nend;\n$fd_import$;\n`;
for(const [id,name,aliases] of cities){
  sql+=`insert into public.fd_directory_cities(id,name,state) values(${quote(id)},${quote(name)},'FL') on conflict(id) do nothing;\n`;
  for(const alias of aliases)sql+=`insert into public.fd_directory_city_aliases(alias,city_id) values(${quote(alias)},${quote(id)}) on conflict do nothing;\n`;
}
const jsonFields=['service_flags','location_flags','source_urls','field_provenance'];
const unchanged=['business_name','address','phone','email','website_url','service_flags','location_flags','service_area','show_level_cuts','languages_spoken'];
for(const row of records){
  const keys=[...fields,'data_origin','field_provenance'];
  sql+=`do $fd_identity$ begin if exists(select 1 from public.fd_directory_businesses where seed_key=${quote(row.seed_key)} and id<>${quote(row.id)}::uuid) then raise exception 'Provider identity conflict for ${row.seed_key}; import rolled back.'; end if; end; $fd_identity$;\n`;
  sql+=`insert into public.fd_directory_businesses as current(${keys.join(',')},status,verified_at) values(${keys.map(k=>jsonFields.includes(k)?json(row[k]):quote(row[k])).join(',')},'approved','2026-11-18T00:00:00Z')\non conflict(seed_key) do update set data_origin=excluded.data_origin,field_provenance=excluded.field_provenance\nwhere row(${unchanged.map(k=>'current.'+k).join(',')}) is not distinct from row(${unchanged.map(k=>'excluded.'+k).join(',')});\n`;
  for(const city of row.service_city_ids)sql+=`insert into public.fd_directory_coverage(business_id,city_id,coverage_type,evidence_url) values(${[row.id,city,row.coverage_type,row.source_urls[0]].map(quote).join(',')}) on conflict do nothing;\n`;
  const evidence={source_urls:row.source_urls,service_flags:row.service_flags,location_flags:row.location_flags,show_level_cuts:row.show_level_cuts,show_level_evidence_url:row.field_provenance.show_level_cuts.source_url,languages_spoken:row.languages_spoken};
  sql+=`insert into public.fd_directory_source_records(business_id,provider,observed_at,retention_basis,attributes) select ${quote(row.id)},'first_party_research','2026-11-18T00:00:00Z','Independently researched business facts with source links',${json(evidence)} where not exists(select 1 from public.fd_directory_source_records where business_id=${quote(row.id)} and provider='first_party_research' and observed_at='2026-11-18T00:00:00Z');\n`;
  sql+=`update public.fd_directory_source_records set attributes=${json(evidence)} where business_id=${quote(row.id)} and provider='first_party_research' and observed_at='2026-11-18T00:00:00Z' and retention_basis='Independently researched business facts with source links';\n`;
}
sql+=`commit;\nselect c.name as city,count(distinct b.id)::integer as searchable_providers\nfrom public.fd_directory_cities c join public.fd_directory_coverage v on v.city_id=c.id\njoin public.fd_directory_businesses b on b.id=v.business_id\nwhere b.status='approved' and b.merged_into_id is null and b.data_origin<>'unverified' and b.service_flags->'grooming'='true'::jsonb\ngroup by c.id,c.name order by c.name;\n`;
await writeFile(new URL('RUN_SECOND_import_providers.sql',out),sql);
// Single transaction for the user's requested one-script workflow. The seed's
// COMMIT closes the schema transaction; the final query shows city counts.
const combined=schema.replace("commit;\nselect 'Directory schema ready; provider import can run next.' as result;\n",'')
  +sql.replace(/^begin;\s*/m,'');
await writeFile(new URL('RUN_THIS_create_tables_and_import.sql',out),combined);
const verify=`-- Read-only validation after the import.\nselect data_origin,count(*)::integer from public.fd_directory_businesses group by data_origin;\nselect count(*)::integer as google_rating_rows from public.fd_directory_businesses where lower(coalesce(rating_source,'')||' '||coalesce(rating_origin,'')) ~ '(google|places[ _-]?api)';\nselect count(*)::integer as raw_google_source_rows from public.fd_directory_source_records where lower(provider) ~ '(google|places[ _-]?api)';\nselect count(*)::integer as pilot_providers,count(google_place_id)::integer as place_ids,count(review_rating)::integer as stored_ratings from public.fd_directory_businesses where seed_key in (${records.map(r=>quote(r.seed_key)).join(',')});\n`;
await writeFile(new URL('VERIFY_directory.sql',out),verify);
const manifest={combined_file:'RUN_THIS_create_tables_and_import.sql',combined_sha256:createHash('sha256').update(combined).digest('hex'),schema_file:'RUN_FIRST_directory_schema.sql',schema_sha256:createHash('sha256').update(schema).digest('hex'),import_file:'RUN_SECOND_import_providers.sql',import_sha256:createHash('sha256').update(sql).digest('hex'),providers:records.length,city_associations:records.reduce((sum,r)=>sum+r.service_city_ids.length,0),place_ids:records.filter(r=>r.google_place_id).length,google_ratings_imported:0,google_api_requests:0};
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
