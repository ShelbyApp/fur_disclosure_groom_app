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
