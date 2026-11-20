import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {canonicalBreed,breedField,loadBreeds} from '../public/breeds.js';

test('breed migration is repeatable, preserves legacy text/history and keeps catalog writes private',async()=>{
  const db=new PGlite(),owner=crypto.randomUUID(),other=crypto.randomUUID(),dog=crypto.randomUUID(),custom=crypto.randomUUID();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.exec(await readFile('supabase/001_owner_profiles.sql','utf8'));
    await db.query('insert into auth.users values($1),($2)',[owner,other]);
    await db.query('insert into public.fd_owner_profiles(owner_id) values($1),($2)',[owner,other]);
    await db.query("insert into public.fd_dogs(id,owner_id,name,breed) values($1,$2,'Milo','Yorkie'),($3,$2,'Pip','My unlisted mix')",[dog,owner,custom]);
    const plan=JSON.stringify({date:'2026-11-20',data:{breed:'Yorkie',name:'Milo'}});
    await db.query("insert into public.fd_grooms(owner_id,dog_id,service,plan) values($1,$2,'Bath',$3::jsonb)",[owner,dog,plan]);
    const sql=await readFile('supabase/010_breed_catalog.sql','utf8');await db.exec(sql);await db.exec(sql);
    assert.equal((await db.query('select count(*)::int as n from public.fd_breeds')).rows[0].n,320);
    assert.deepEqual((await db.query('select breed,breed_id from public.fd_dogs where id=$1',[dog])).rows[0],{breed:'Yorkie',breed_id:'yorkshire-terrier'});
    assert.equal((await db.query('select breed_id from public.fd_dogs where id=$1',[custom])).rows[0].breed_id,null);
    assert.deepEqual((await db.query('select plan from public.fd_grooms')).rows[0].plan,JSON.parse(plan));
    await db.exec('set role anon');
    assert.equal((await db.query("select id from public.fd_breeds where name='Unknown'")).rows[0].id,'unknown');
    await assert.rejects(db.query("insert into public.fd_breeds(id,name,kind) values('forged','Forged','breed')"),e=>e.code==='42501');
    await assert.rejects(db.query('select * from public.fd_dogs'),e=>e.code==='42501');
    await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    for(const [value,id]of [['unkown','unknown'],['Not sure','unknown'],['','unknown'],['Golden Doodle','goldendoodle'],['Mixed','mixed-breed'],['Toy Poodle','poodle-toy'],['My custom mix',null]]){
      await db.query('update public.fd_dogs set breed=$1 where id=$2',[value,dog]);
      assert.equal((await db.query('select breed_id from public.fd_dogs where id=$1',[dog])).rows[0].breed_id,id);
    }
    await assert.rejects(db.query("update public.fd_breeds set name='Changed' where id='unknown'"),e=>e.code==='42501');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    assert.equal((await db.query('select * from public.fd_dogs')).rows.length,0);
  } finally {await db.close();}
});
test('breed fallback supports aliases and arbitrary mixes without injecting markup',async()=>{
  await loadBreeds({from(){throw Error('Database not migrated');}});
  assert.equal(canonicalBreed('unkown'),'Unknown');assert.equal(canonicalBreed('Yorkie'),'Yorkshire Terrier');
  assert.equal(canonicalBreed('  My custom mix  '),'My custom mix');
  const html=breedField('\" onfocus=alert(1)');
  assert.ok(html.includes('value="&quot; onfocus=alert(1)"'));assert.ok(html.includes('value="Unknown"'));
});
