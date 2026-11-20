import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('lookbook filters combine before pagination and disclose only labeled public photos',async()=>{
  const db=new PGlite(),a=crypto.randomUUID(),b=crypto.randomUUID(),doodle=crypto.randomUUID(),yorkie=crypto.randomUUID();
  try{
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const file of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql','003_service_directory.sql','006_lookbook_sharing.sql','007_public_gallery.sql','008_lookbook_inspiration.sql','009_restore_public_uploads.sql','010_breed_catalog.sql'])await db.exec(await readFile('supabase/'+file,'utf8'));
    await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
    await db.query('insert into public.fd_owner_profiles(owner_id) values($1),($2)',[a,b]);
    await db.query("insert into public.fd_dogs(id,owner_id,name,breed,birthday) values($1,$2,'Milo','Goldendoodle','2025-01-01'),($3,$4,'Pip','Yorkie',null)",[doodle,a,yorkie,b]);
    const legacy=crypto.randomUUID();await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility) values($1,$2,$3,'data:image/png;base64,bGVnYWN5','public')",[legacy,a,doodle]);
    const sql=await readFile('supabase/011_lookbook_discovery.sql','utf8');await db.exec(sql);await db.exec(sql);
    assert.equal((await db.query('select life_stage from public.fd_dog_photos where id=$1',[legacy])).rows[0].life_stage,'unknown');
    await db.exec("insert into public.fd_directory_cities(id,name,state) values('tampa-fl','Tampa','FL')");
    const provider=crypto.randomUUID();await db.query("insert into public.fd_directory_businesses(id,business_name,status,entry_source) values($1,'Test salon','approved','user_entered')",[provider]);
    await db.query("insert into public.fd_directory_coverage values($1,'tampa-fl','storefront','')",[provider]);
    const ids=[];
    for(let i=0;i<18;i++){
      const id=crypto.randomUUID();ids.push(id);
      await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility,life_stage,quality_score,provider_id,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,'2026-11-20T12:00:00Z')",[id,a,doodle,'data:image/png;base64,'+Buffer.from(id).toString('base64'),i===16?'private':'public',i===17?'adult':'puppy',i===15?1:null,provider]);
    }
    const adult=crypto.randomUUID();await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility,life_stage) values($1,$2,$3,'data:image/png;base64,eW9ya2ll','public','adult')",[adult,b,yorkie]);
    await db.exec('set role anon');
    const search=async(breed,stage='all')=>(await db.query('select * from public.fd_gallery_search(p_breed=>$1,p_life_stage=>$2)',[breed,stage])).rows;
    const page1=await search('Golden Doodle','puppy');assert.equal(page1.length,13);assert.ok(page1.every(p=>p.breed==='Goldendoodle'&&p.life_stage==='puppy'));
    const cursor=page1[11],page2=(await db.query("select * from public.fd_gallery_search(p_breed=>'Goldendoodle',p_life_stage=>'puppy',p_before_time=>$1,p_before_id=>$2)",[cursor.created_at,cursor.id])).rows;
    assert.equal(page2.length,3);assert.equal(new Set([...page1.slice(0,12),...page2].map(p=>p.id)).size,15);
    assert.equal((await search('doodle','adult')).length,1);assert.equal((await search('Yorkshire Terrier','adult'))[0].id,adult);
    assert.equal((await search('Yorkie','puppy')).length,0);assert.equal((await search('Unknown','puppy')).length,0);
    assert.equal((await search('zzzz')).length,0);assert.equal((await search("x'; drop table auth.users; --")).length,0);
    const combined=(await db.query("select * from public.fd_gallery_search(p_breed=>'Goldendoodle',p_life_stage=>'adult',p_city_id=>'tampa-fl',p_author=>'owner')")).rows;assert.equal(combined.length,1);
    assert.equal((await db.query("select * from public.fd_gallery_search(p_breed=>'Goldendoodle',p_life_stage=>'adult',p_author=>'groomer')")).rows.length,0);
    for(const id of [ids[15],ids[16]])assert.equal((await db.query('select * from public.fd_gallery_search(p_photo_id=>$1)',[id])).rows.length,0);
    assert.equal((await db.query('select * from public.fd_gallery_items()')).rows.length,13);
    assert.equal((await db.query('select * from public.fd_gallery_search(p_photo_id=>$1)',[legacy])).rows[0].life_stage,'unknown');
    assert.ok(!('birthday' in page1[0]));assert.ok(!('owner_id' in page1[0]));
    await assert.rejects(search('Poodle','senior'),e=>e.code==='22023');await assert.rejects(search('%'),e=>e.code==='22023');
    await assert.rejects(db.query('select * from public.fd_gallery_source'),e=>e.code==='42501');
    await assert.rejects(db.query('select * from public.fd_dog_photos'),e=>e.code==='42501');
    await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
    await db.query("update public.fd_dog_photos set life_stage='adult' where id=$1",[legacy]);
    assert.equal((await db.query("update public.fd_dog_photos set life_stage='puppy' where id=$1 returning id",[adult])).rows.length,0);
    await assert.rejects(db.query("update public.fd_dog_photos set life_stage='senior' where id=$1",[legacy]),e=>e.code==='23514');
    await db.query("update public.fd_dog_photos set visibility='private' where id=$1",[legacy]);
    await db.exec('reset role;set role anon');assert.equal((await db.query('select * from public.fd_gallery_search(p_photo_id=>$1)',[legacy])).rows.length,0);
  }finally{await db.close();}
});
