import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {directoryCard,flagsFromForm} from '../public/directory.js';

test('combined SQL upgrades the earlier pilot, removes Google caches and preserves owner contacts and provider edits',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    for(const file of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql','003_service_directory.sql','004_directory_pilot.sql'])await db.exec(await readFile('supabase/'+file,'utf8'));
    const owner=crypto.randomUUID(),contact=crypto.randomUUID();
    await db.query('insert into auth.users values($1)',[owner]);await db.query("insert into public.fd_owner_profiles(owner_id,display_name) values($1,'Existing owner')",[owner]);
    await db.query("insert into public.fd_groomers(id,owner_id,name,business) values($1,$2,'My groomer','Private business')",[contact,owner]);
    const provider=(await db.query("select id from public.fd_directory_businesses where seed_key='puptown-mobile-tampa-bay'")).rows[0].id;
    await db.query("update public.fd_directory_businesses set review_rating=5,review_count=100,rating_source='Google Maps',rating_checked_at=now(),rating_valid_until=now()+interval '30 days' where id=$1",[provider]);
    await db.query("insert into public.fd_directory_source_records(business_id,provider,observed_at,retention_basis,attributes) values($1,'google_places',now(),'old cache','{\"rating\":5}')",[provider]);
    await db.query("update public.fd_directory_businesses set phone='813-555-0199' where seed_key='urbanwagz-tampa'");
    const combined=await readFile('supabase/deploy/RUN_THIS_create_tables_and_import.sql','utf8');
    await db.exec(combined);await db.exec(combined);
    assert.equal((await db.query('select count(*)::int n from public.fd_directory_businesses')).rows[0].n,41);
    assert.equal((await db.query('select count(*)::int n from public.fd_directory_coverage')).rows[0].n,44);
    assert.equal((await db.query('select count(*)::int n from public.fd_directory_businesses where review_rating is not null')).rows[0].n,0);
    assert.equal((await db.query("select count(*)::int n from public.fd_directory_source_records where provider='google_places'")).rows[0].n,0);
    assert.equal((await db.query('select name from public.fd_groomers where id=$1',[contact])).rows[0].name,'My groomer');
    const edited=(await db.query("select phone,data_origin from public.fd_directory_businesses where seed_key='urbanwagz-tampa'")).rows[0];
    assert.equal(edited.phone,'813-555-0199');assert.equal(edited.data_origin,'unverified');
    assert.equal((await db.query('select data_origin from public.fd_directory_businesses where id=$1',[provider])).rows[0].data_origin,'first_party_website');
  }finally{await db.close();}
});

test('directory cards escape untrusted contacts, reject unsafe URLs and show one decimal ratings',()=>{
  const html=directoryCard({id:'a',business_name:'<img onerror=evil>',phone:'555-0100',website_url:'javascript:alert(1)',review_rating:5,review_count:12,rating_source:'Fur Disclosure',google_place_id:'abc',service_flags:{grooming:true,boarding:null},location_flags:{mobile:true},service_area:'Tampa'});
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('javascript:'));assert.ok(html.includes('5.0 / 5'));assert.ok(!html.includes('· boarding'));assert.ok(html.includes('Fur Disclosure'));assert.ok(!html.includes('Google Maps'));
  assert.ok(!directoryCard({id:'a',business_name:'Example',review_rating:5,rating_source:'Google Maps'}).includes('5.0 / 5'));
  assert.deepEqual(flagsFromForm({service_grooming:'on'},'service_',['grooming','daycare','boarding']),{grooming:true,daycare:null,boarding:null});
});
test('city search, mobile coverage, paging, private contacts, deduplication and permissions',async()=>{
  const db=new PGlite(),a=crypto.randomUUID(),b=crypto.randomUUID();
  try {
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values($1),($2)',[a,b]);
    for(const file of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql'])await db.exec(await readFile('supabase/'+file,'utf8'));
    const deployment=await readFile('supabase/deploy/RUN_THIS_create_tables_and_import.sql','utf8');
    await db.exec(deployment);await db.exec(deployment);
    assert.equal((await db.query('select count(*)::int n from public.fd_directory_businesses')).rows[0].n,41);
    assert.equal((await db.query('select count(*)::int n from public.fd_directory_source_records')).rows[0].n,41);
    await db.query('insert into public.fd_owner_profiles(owner_id,display_name) values($1,$3),($2,$4)',[a,b,'Alex','Blair']);
    const login=async uid=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);};
    const search=async(city,query='',service='grooming',mode='all',offset=0)=>(await db.query('select * from public.fd_search_directory($1,$2,$3,$4,$5)',[city,query,service,mode,offset])).rows;
    await login(a);
    for(const alias of ['St Pete','Saint Peters','St. Petersburg','stpete'])assert.equal((await db.query('select * from public.fd_find_directory_cities($1)',[alias])).rows[0].id,'st-petersburg-fl');
    assert.equal((await db.query("select * from public.fd_find_directory_cities('s')")).rows.length,0);
    assert.equal((await search('unknown')).length,0);
    assert.equal((await search('st-petersburg-fl')).length,8);assert.equal((await search('tampa-fl')).length,11);
    const page=await search('sarasota-fl'),more=await search('sarasota-fl','','grooming','all',20);
    assert.equal(page.length,21);assert.equal(more.length,5);assert.equal(new Set([...page.slice(0,20),...more].map(r=>r.id)).size,25);
    const mobileT=await search('tampa-fl','Pupt','grooming','mobile'),mobileS=await search('st-petersburg-fl','Pupt','grooming','mobile');
    assert.equal(mobileT.length,1);assert.equal(mobileT[0].id,mobileS[0].id);assert.equal((await search('sarasota-fl','Pupt')).length,0);
    assert.equal((await search('tampa-fl','Pupt','grooming','fixed_location')).length,0);
    assert.equal((await search('tampa-fl','Pupt','boarding')).length,0);
    assert.equal((await search('tampa-fl','Doggy','boarding')).length,1);
    await assert.rejects(search(null));await assert.rejects(search('tampa-fl','','invalid'));
    await assert.rejects(db.query('select * from public.fd_directory_source_records'),e=>e.code==='42501');
    await assert.rejects(db.query('select * from public.fd_directory_businesses'),e=>e.code==='42501');
    const save=async id=>(await db.query('select * from public.fd_save_directory_groomer($1)',[id])).rows[0];
    const first=await save(mobileT[0].id);assert.equal((await save(mobileT[0].id)).id,first.id);assert.equal(first.entry_source,'auto_populated');assert.equal(first.name,'');assert.equal(first.business,mobileT[0].business_name);
    await assert.rejects(db.query("update public.fd_groomers set entry_source='user_entered' where id=$1",[first.id]),e=>e.code==='42501');
    const contactId=crypto.randomUUID(),contact={business:'Puptown Mobile Grooming',name:'Jamie',phone:''};
    const submit=async (id=contactId,services={grooming:true,daycare:null,boarding:null})=>(await db.query('select * from public.fd_submit_directory_groomer($1,$2,$3,$4,$5,$6,$7)',[id,contact,null,'Tampa, FL',services,{mobile:true,fixed_location:null},'South Tampa'])).rows[0];
    const submitted=await submit();assert.equal(submitted.id,contactId);assert.equal((await submit()).id,contactId);assert.equal(submitted.entry_source,'user_entered');
    assert.equal((await search('tampa-fl','Pupt')).length,1);
    await assert.rejects(submit(crypto.randomUUID(),{grooming:'true',daycare:null,boarding:null}));
    await assert.rejects(db.query('select * from public.fd_directory_submissions'),e=>e.code==='42501');
    await login(b);assert.equal((await db.query('select * from public.fd_groomers')).rows.length,0);
    await assert.rejects(submit(),e=>e.code==='42501');
    const otherSubmission=await submit(crypto.randomUUID());
    const secondOwner=await save(mobileT[0].id);assert.notEqual(secondOwner.id,first.id);assert.equal(secondOwner.owner_id,b);
    await db.exec('reset role');
    const pending=(await db.query('select * from public.fd_directory_submissions')).rows;assert.equal(pending.length,2);
    assert.deepEqual(pending.find(s=>s.id===contactId).duplicate_candidate_ids,[mobileT[0].id]);assert.equal(pending[0].review_status,'pending');
    assert.equal(pending.find(s=>s.id===contactId).city_id,'tampa-fl');
    assert.deepEqual(pending.find(s=>s.id===otherSubmission.id).duplicate_submission_ids,[contactId]);
    await assert.rejects(db.query("update public.fd_directory_businesses set review_rating=4.8,review_count=10 where id=$1",[mobileT[0].id]),e=>e.code==='23514');
    await assert.rejects(db.query("insert into public.fd_directory_source_records(business_id,provider,observed_at,retention_basis,attributes) values($1,'google_places',now(),'temporary','{}')",[mobileT[0].id]),e=>e.code==='23514');
    await db.query("update public.fd_directory_businesses set review_rating=4.8,review_count=10,rating_source='Fur Disclosure',rating_origin='app_reviews',rating_checked_at=now(),rating_valid_until=now()-interval '1 second' where id=$1",[mobileT[0].id]);
    await assert.rejects(db.query("update public.fd_directory_businesses set rating_source='Google Maps' where id=$1",[mobileT[0].id]),e=>e.code==='23514');
    await login(a);assert.equal((await search('tampa-fl','Pupt'))[0].review_rating,null);
    await db.exec('reset role');await db.query("update public.fd_directory_businesses set rating_valid_until=now()+interval '1 minute' where id=$1",[mobileT[0].id]);
    await login(a);assert.equal(Number((await search('tampa-fl','Pupt'))[0].review_rating),4.8);
    await db.exec('reset role');await db.query("update public.fd_directory_businesses set status='pending' where id=$1",[mobileT[0].id]);
    await login(a);assert.equal((await search('tampa-fl','Pupt')).length,0);await assert.rejects(save(mobileT[0].id));
    await db.exec('reset role;set role anon');await assert.rejects(search('tampa-fl'),e=>e.code==='42501');
  }finally{await db.close();}
});
