import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {ageAt, beginVisit} from '../public/profile-model.js';
import {browserConfig} from '../scripts/config.mjs';
import {snapshot} from '../public/flow.js';

test('dog defaults and identity prefill a fresh visit while a copied visit keeps independent preferences',()=>{
  const dog={id:'a',name:'Milo',breed:'Doodle',birthday:'2022-04-05',care_defaults:{time:'Ask me first',fees:'Ask before any added fee',anxiety:'A little nervous'}};
  const owner={owner_id:'owner-a',display_name:'Alex',email:'alex@example.test',phone:''};
  const fresh=beginVisit(dog,owner);
  assert.equal(fresh.answers.fees,dog.care_defaults.fees);
  assert.equal(fresh.answers.birthday,dog.birthday);
  assert.equal(ageAt('2022-04-05',new Date(2025,3,4)),'2 years');
  const original={data:{mode:'advanced',head:'Rounded',time:'Up to 15 extra minutes',visit:'2020-01-01',includeContact:true,pins:{sensitiveMap:[{note:'Left paw',x:22,y:44}]}}};
  const repeat=beginVisit(dog,owner,original);
  repeat.answers.pins.sensitiveMap.pop();repeat.answers.head='Natural';
  assert.equal(repeat.answers.time,'Up to 15 extra minutes');assert.equal(original.data.pins.sensitiveMap.length,1);
  assert.equal(original.data.head,'Rounded');assert.equal(repeat.answers.visit,'');assert.equal(repeat.answers.checked,false);
  assert.equal(snapshot(repeat.answers).data.email,undefined);assert.notEqual(fresh.recordId,repeat.recordId);
});

test('build config only accepts publishable keys',()=>{
  assert.equal(browserConfig({}).publishableKey,'');
  assert.throws(()=>browserConfig({SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'}));
  assert.throws(()=>browserConfig({SUPABASE_PUBLISHABLE_KEY:'eyJexample'}));
});

test('a saved groomer fills visit details without changing a copied historical plan',()=>{
  const dog={id:'dog',name:'Pip',breed:'Terrier',care_defaults:{}};
  const old={data:{groomer:'Previous person',salon:'Previous salon'}};
  const owner={owner_id:'owner',display_name:'Alex',selectedGroomer:{name:'Jamie',business:'Maple & Mutt',address:'12 Main St',email:'jamie@example.test',phone:'555-0102'}};
  const visit=beginVisit(dog,owner,old);
  assert.equal(visit.answers.groomer,'Jamie');
  assert.equal(visit.answers.salon,'Maple & Mutt');
  assert.equal(snapshot(visit.answers).data.groomerAddress,'12 Main St');
  assert.equal(old.data.groomer,'Previous person');
  assert.equal(beginVisit(dog,{...owner,selectedGroomer:undefined},old).answers.groomer,'Previous person');
});

test('groomer and photo migration backfills dog photos, deduplicates copies and isolates owners',async()=>{
  const db=new PGlite();
  const a=crypto.randomUUID(),b=crypto.randomUUID(),dogA=crypto.randomUUID(),dogB=crypto.randomUUID(),groomer=crypto.randomUUID();
  const image='data:image/jpeg;base64,YWJj',inspiration='data:image/jpeg;base64,ZGVm';
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values($1),($2)',[a,b]);
    await db.exec(await readFile('supabase/001_owner_profiles.sql','utf8'));
    await db.query('insert into public.fd_owner_profiles(owner_id,display_name) values($1,$3),($2,$4)',[a,b,'Alex','Blair']);
    await db.query('insert into public.fd_dogs(id,owner_id,name) values($1,$2,$5),($3,$4,$6)',[dogA,a,dogB,b,'Milo','Pip']);
    const addVisit=(photo)=>db.query('insert into public.fd_grooms(owner_id,dog_id,service,plan) values($1,$2,$3,$4::jsonb)',[a,dogA,'Bath + haircut',JSON.stringify({date:'2026-11-17',data:{currentFace:photo,currentSide:photo,reference:inspiration}})]);
    await addVisit(image);
    await db.exec(await readFile('supabase/002_profiles_groomers_lookbook.sql','utf8'));
    const login=async uid=>{await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);};
    await login(a);
    const photos=()=>db.query('select * from public.fd_dog_photos');
    assert.equal((await photos()).rows.length,1);
    assert.equal((await photos()).rows[0].image_data,image);
    await addVisit(image);assert.equal((await photos()).rows.length,1);
    await addVisit('data:image/png;base64,Z2hp');assert.equal((await photos()).rows.length,2);
    await db.query('update public.fd_owner_profiles set city=$1,state=$2 where owner_id=$3',['Austin','TX',a]);
    assert.equal((await db.query('select city from public.fd_owner_profiles')).rows[0].city,'Austin');
    await db.query('insert into public.fd_groomers(id,owner_id,name,business) values($1,$2,$3,$4)',[groomer,a,'Jamie','Maple & Mutt']);
    await db.query('update public.fd_groomers set phone=$1 where id=$2',['555-0101',groomer]);
    await assert.rejects(db.query('update public.fd_groomers set owner_id=$1 where id=$2',[b,groomer]),e=>e.code==='42501');
    await login(b);
    assert.equal((await photos()).rows.length,0);
    assert.equal((await db.query('select * from public.fd_groomers')).rows.length,0);
    assert.equal((await db.query('update public.fd_groomers set name=$1 where id=$2 returning id',['Other',groomer])).rows.length,0);
    await assert.rejects(db.query('insert into public.fd_groomers(owner_id,name) values($1,$2)',[a,'Other']),e=>e.code==='42501');
    const addPhoto=(owner,dog,photo)=>db.query('insert into public.fd_dog_photos(owner_id,dog_id,image_data) values($1,$2,$3)',[owner,dog,photo]);
    await assert.rejects(addPhoto(b,dogA,image),e=>e.code==='23503');
    await assert.rejects(addPhoto(a,dogA,image),e=>e.code==='42501');
    await assert.rejects(addPhoto(b,dogB,'data:image/svg+xml;base64,YWJj'),e=>e.code==='23514');
    await addPhoto(b,dogB,image);assert.equal((await photos()).rows.length,1);
    await db.exec('reset role;set role anon;');
    await assert.rejects(photos(),e=>e.code==='42501');
    await assert.rejects(db.query('select * from public.fd_groomers'),e=>e.code==='42501');
  } finally {await db.close();}
});

test('PostgreSQL enforces owner isolation, same-dog copies and immutable history',async()=>{
  const db=new PGlite();
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const dogA=crypto.randomUUID(),dogA2=crypto.randomUUID(),dogB=crypto.randomUUID(),visit=crypto.randomUUID();
  const plan=JSON.stringify({date:'2026-01-01',data:{name:'Milo',mode:'basic'}});
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${a}'),('${b}');`);
    await db.exec(await readFile('supabase/001_owner_profiles.sql','utf8'));
    const login=async uid=>{await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);};
    await login(a);
    await db.query('insert into public.fd_owner_profiles(owner_id,display_name) values ($1,$2)',[a,'Alex']);
    await db.query('insert into public.fd_dogs(id,owner_id,name) values ($1,$2,$3),($4,$2,$5)',[dogA,a,'Milo',dogA2,'Pip']);
    const addVisit=(id,owner,dog,copy=null)=>db.query('insert into public.fd_grooms(id,owner_id,dog_id,copied_from,service,plan) values($1,$2,$3,$4,$5,$6::jsonb)',[id,owner,dog,copy,'Bath only',plan]);
    await addVisit(visit,a,dogA);
    await addVisit(crypto.randomUUID(),a,dogA,visit);
    await assert.rejects(addVisit(crypto.randomUUID(),a,dogA2,visit),e=>e.code==='23503');
    await assert.rejects(db.query('update public.fd_grooms set service=$1 where id=$2',['New haircut',visit]),e=>e.code==='42501');
    await login(b);
    for(const table of ['fd_owner_profiles','fd_dogs','fd_grooms']) assert.equal((await db.query('select * from public.'+table)).rows.length,0);
    await db.query('insert into public.fd_owner_profiles(owner_id) values ($1)',[b]);
    await db.query('insert into public.fd_dogs(id,owner_id,name) values($1,$2,$3)',[dogB,b,'Berta']);
    await assert.rejects(addVisit(crypto.randomUUID(),b,dogA),e=>e.code==='23503');
    await assert.rejects(addVisit(crypto.randomUUID(),a,dogA),e=>e.code==='42501');
    assert.equal((await db.query('update public.fd_dogs set name=$1 where id=$2 returning id',['Other',dogA])).rows.length,0);
    await login(a);assert.equal((await db.query('select * from public.fd_grooms')).rows.length,2);
    await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from public.fd_dogs'),e=>e.code==='42501');
  } finally {await db.close();}
});
