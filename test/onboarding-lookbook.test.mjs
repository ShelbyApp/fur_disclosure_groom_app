import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {accountRole,signupIntent,signupOptions} from '../public/signup-intent.js';

test('onboarding role survives signup; existing account identity wins over incoming links',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(signupIntent('https://groom.furdisclosure.com/?role=groomer#/create-account',storage),'groomer');
  assert.equal(signupIntent('https://groom.furdisclosure.com/#/account',storage),'groomer');
  const options=signupOptions('groomer','https://groom.furdisclosure.com/?role=groomer&source=landing-onboarding#/create-account');
  assert.deepEqual(options,{emailRedirectTo:'https://groom.furdisclosure.com/',data:{fd_account_role:'groomer'}});
  assert.equal(accountRole({user_metadata:options.data}),'groomer');
  assert.equal(accountRole({user_metadata:{}}),'owner');
  assert.equal(accountRole({user_metadata:{fd_account_role:'admin'}}),'owner');
  assert.equal(signupOptions('admin','https://example.test/').data.fd_account_role,'owner');
});

test('photo visibility, provider tags and public projection preserve privacy in PostgreSQL',async()=>{
  const db=new PGlite(),a=crypto.randomUUID(),b=crypto.randomUUID(),dog=crypto.randomUUID(),photo=crypto.randomUUID();
  try {
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const name of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql','003_service_directory.sql'])await db.exec(await readFile('supabase/'+name,'utf8'));
    await db.query('insert into auth.users values($1),($2)',[a,b]);
    await db.query("insert into public.fd_owner_profiles(owner_id,display_name,phone) values($1,'Private name','555-secret')",[a]);
    await db.query("insert into public.fd_dogs(id,owner_id,name,breed,care_defaults) values($1,$2,'Milo','Doodle','{\"allergies\":\"private health\"}')",[dog,a]);
    await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data) values($1,$2,$3,'data:image/png;base64,YWJj')",[photo,a,dog]);
    const migration=await readFile('supabase/006_lookbook_sharing.sql','utf8');await db.exec(migration);await db.exec(migration);
    assert.equal((await db.query('select visibility from public.fd_dog_photos')).rows[0].visibility,'private');
    await db.exec("insert into public.fd_directory_cities(id,name,state) values('tampa','Tampa','FL')");
    const provider=crypto.randomUUID(),pending=crypto.randomUUID(),mobile=crypto.randomUUID();
    await db.query(`insert into public.fd_directory_businesses(id,business_name,status,entry_source,service_flags,location_flags)
      values($1,'Happy Daycare','approved','auto_populated','{"grooming":false,"daycare":true,"boarding":true}','{"fixed_location":true,"mobile":false}'),
      ($2,'Hidden Business','pending','user_entered','{"grooming":true,"daycare":null,"boarding":null}','{"fixed_location":null,"mobile":null}'),
      ($3,'Rolling Pups','approved','auto_populated','{"grooming":true,"daycare":null,"boarding":null}','{"fixed_location":false,"mobile":true}')`,[provider,pending,mobile]);
    await db.query("insert into public.fd_directory_coverage values($1,'tampa','storefront',''),($2,'tampa','service_area','')",[provider,mobile]);
    const login=async id=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    await login(a);
    const search=async q=>(await db.query('select * from public.fd_find_photo_providers($1)',[q])).rows;
    assert.equal((await search('Happy Tampa'))[0].id,provider);
    assert.equal((await search('daycare'))[0].id,provider);
    assert.equal((await search('mobile'))[0].id,mobile);
    assert.equal((await search('tampa')).length,2);
    assert.equal((await search('Hidden')).length,0);
    assert.equal((await search('%')).length,0);
    assert.equal((await search("x'; select * from auth.users --")).length,0);
    await assert.rejects(db.query('update public.fd_dog_photos set provider_id=$1 where id=$2',[pending,photo]));
    await db.query("update public.fd_dog_photos set visibility='public',provider_id=$1,caption='Fresh groom' where id=$2",[provider,photo]);
    assert.equal((await db.query('select provider_label from public.fd_dog_photos')).rows[0].provider_label,'Happy Daycare');
    await assert.rejects(db.query("update public.fd_dog_photos set provider_label='Forged' where id=$1",[photo]),e=>e.code==='42501');
    await assert.rejects(db.query("update public.fd_dog_photos set visibility='other' where id=$1",[photo]),e=>e.code==='23514');
    await login(b);
    assert.equal((await db.query('select * from public.fd_dog_photos')).rows.length,0);
    assert.equal((await db.query("update public.fd_dog_photos set visibility='private' where id=$1 returning id",[photo])).rows.length,0);
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select * from public.fd_dog_photos'),e=>e.code==='42501');
    await assert.rejects(search('Tampa'),e=>e.code==='42501');
    const shared=(await db.query('select * from public.fd_public_lookbook()')).rows;
    assert.equal(shared.length,1);assert.equal(shared[0].dog_name,'Milo');
    assert.deepEqual(Object.keys(shared[0]).sort(),['id','image_data','caption','dog_name','breed','provider_id','provider_label','created_at'].sort());
    assert.ok(!JSON.stringify(shared).includes('private health'));assert.ok(!JSON.stringify(shared).includes(a));
    await login(a);
    await db.query("update public.fd_dog_photos set visibility='private',provider_id=null where id=$1",[photo]);
    assert.equal((await db.query('select * from public.fd_public_lookbook()')).rows.length,0);
    assert.equal((await db.query('select provider_label from public.fd_dog_photos')).rows[0].provider_label,'');
    await db.query("insert into public.fd_grooms(owner_id,dog_id,service,plan) values($1,$2,'Bath','{\"date\":\"2026-11-19\",\"data\":{\"currentFace\":\"data:image/png;base64,ZGVm\"}}')",[a,dog]);
    assert.equal((await db.query('select count(*)::int n from public.fd_dog_photos where visibility=\'private\'')).rows[0].n,2);
  }finally{await db.close();}
});
