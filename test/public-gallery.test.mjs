import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('eight database inspiration images are rated, distinguishable, stable and ordered with approved uploads',async()=>{
  const db=new PGlite(),owner=crypto.randomUUID(),dog=crypto.randomUUID();
  try{
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const name of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql','003_service_directory.sql','006_lookbook_sharing.sql','007_public_gallery.sql'])await db.exec(await readFile('supabase/'+name,'utf8'));
    const seed=await readFile('supabase/008_lookbook_inspiration.sql','utf8');await db.exec(seed);await db.exec(seed);
    const seeded=(await db.query('select id,seed_key,quality_score,image_data,created_at from public.fd_lookbook_inspiration order by id desc')).rows;
    assert.equal(seeded.length,8);assert.ok(seeded.every(r=>r.quality_score===8&&r.image_data.startsWith('data:image/jpeg;base64,')));
    for(const row of seeded){const bytes=Buffer.from(row.image_data.split(',')[1],'base64');assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length>10000);}
    const featured=async()=>(await db.query('select * from public.fd_gallery_featured()')).rows;
    await db.exec('set role anon');const first=await featured();assert.equal(first.length,8);assert.deepEqual(await featured(),first);
    assert.ok(first.every(r=>r.uploader_type==='inspiration'&&r.provider_id===null&&r.location_label===''));
    assert.equal((await db.query("select * from public.fd_gallery_items(null,null,'owner')")).rows.length,0);
    assert.equal((await db.query("select * from public.fd_gallery_items('tampa-fl')")).rows.length,0);
    assert.equal((await db.query('select * from public.fd_gallery_image($1)',[first[0].id])).rows[0].image_data,seeded[0].image_data);
    assert.equal((await db.query('select * from public.fd_public_lookbook()')).rows.length,8);
    await assert.rejects(db.query('select * from public.fd_lookbook_inspiration'),e=>e.code==='42501');
    await db.exec('reset role');await db.query('insert into auth.users(id) values($1)',[owner]);
    await db.query("insert into public.fd_owner_profiles(owner_id,display_name) values($1,'Private owner')",[owner]);
    await db.query("insert into public.fd_dogs(id,owner_id,name) values($1,$2,'Milo')",[dog,owner]);
    const newest=crypto.randomUUID(),unrated=crypto.randomUUID(),low=crypto.randomUUID(),privateId=crypto.randomUUID();
    for(const [i,id,visibility,score] of [[1,newest,'public',3],[2,unrated,'public',null],[3,low,'public',1],[4,privateId,'private',10]])
      await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility,quality_score,created_at) values($1,$2,$3,$4,$5,$6,'2099-01-01')",[id,owner,dog,'data:image/png;base64,'+Buffer.from(String(i)).toString('base64'),visibility,score]);
    await db.exec('set role anon');const newestFirst=await featured();assert.equal(newestFirst.length,8);assert.equal(newestFirst[0].id,newest);
    const all=(await db.query('select * from public.fd_gallery_items()')).rows;assert.equal(all.length,9);assert.ok(!all.some(r=>[unrated,low,privateId].includes(r.id)));
    for(const id of [unrated,low,privateId])assert.equal((await db.query('select * from public.fd_gallery_image($1)',[id])).rows.length,0);
    await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await assert.rejects(db.query('update public.fd_lookbook_inspiration set quality_score=10'),e=>e.code==='42501');
    await assert.rejects(db.query("insert into public.fd_lookbook_inspiration(seed_key,title,breed,caption,image_data,quality_score) values('fake','Fake','','','data:image/png;base64,YWJj',10)"),e=>e.code==='42501');
    await db.exec('reset role');await db.query('update public.fd_lookbook_inspiration set quality_score=1 where id=$1',[seeded[0].id]);
    await db.query('update public.fd_lookbook_inspiration set published=false where id=$1',[seeded[1].id]);await db.exec(seed);
    assert.deepEqual((await db.query('select created_at from public.fd_lookbook_inspiration order by id desc')).rows.map(r=>r.created_at),seeded.map(r=>r.created_at));
    await db.exec('set role anon');assert.equal((await featured()).length,7);
    for(const id of [seeded[0].id,seeded[1].id])assert.equal((await db.query('select * from public.fd_gallery_image($1)',[id])).rows.length,0);
  }finally{await db.close();}
});
test('public gallery filters, quality priority, paging and permissions use only opted-in photos',async()=>{
  const db=new PGlite(),owner=crypto.randomUUID(),groomer=crypto.randomUUID(),dogA=crypto.randomUUID(),dogB=crypto.randomUUID();
  try{
    await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const name of ['001_owner_profiles.sql','002_profiles_groomers_lookbook.sql','003_service_directory.sql','006_lookbook_sharing.sql'])await db.exec(await readFile('supabase/'+name,'utf8'));
    await db.query("insert into auth.users values($1,'{}'),($2,'{\"fd_account_role\":\"groomer\"}')",[owner,groomer]);
    await db.query("insert into public.fd_owner_profiles(owner_id,display_name,city,phone) values($1,'Private owner','Secret city','private phone'),($2,'Private groomer','Secret city','private phone')",[owner,groomer]);
    await db.query("insert into public.fd_dogs(id,owner_id,name,breed,care_defaults) values($1,$2,'Milo','Doodle','{\"allergies\":\"private info\"}'),($3,$4,'Lola','Poodle','{}')",[dogA,owner,dogB,groomer]);
    await db.exec("insert into public.fd_directory_cities values('tampa-fl','Tampa','FL','US'),('st-petersburg-fl','St. Petersburg','FL','US'),('sarasota-fl','Sarasota','FL','US');insert into public.fd_directory_city_aliases values('stpete','st-petersburg-fl')");
    const mobile=crypto.randomUUID(),daycare=crypto.randomUUID(),pending=crypto.randomUUID();
    await db.query("insert into public.fd_directory_businesses(id,business_name,status,entry_source) values($1,'Rolling Pups','approved','user_entered'),($2,'Happy Daycare','approved','auto_populated'),($3,'Pending listing','pending','user_entered')",[mobile,daycare,pending]);
    await db.query("insert into public.fd_directory_coverage values($1,'tampa-fl','service_area',''),($1,'st-petersburg-fl','service_area',''),($2,'sarasota-fl','storefront','')",[mobile,daycare]);
    const prior=crypto.randomUUID();await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility) values($1,$2,$3,'data:image/png;base64,bGVnYWN5','public')",[prior,groomer,dogB]);
    const sql=await readFile('supabase/007_public_gallery.sql','utf8');await db.exec(sql);await db.exec(sql);
    assert.equal((await db.query('select uploader_type from public.fd_dog_photos where id=$1',[prior])).rows[0].uploader_type,'groomer');
    const ids=[];
    for(let i=0;i<18;i++){
      const id=crypto.randomUUID(),isGroomer=i%2===1;ids.push(id);
      await db.query("insert into public.fd_dog_photos(id,owner_id,dog_id,image_data,visibility,provider_id,quality_score,created_at) values($1,$2,$3,$4,$5,$6,$7,'2026-11-19T12:00:00Z')",
        [id,isGroomer?groomer:owner,isGroomer?dogB:dogA,'data:image/png;base64,'+Buffer.from('photo'+i).toString('base64'),i===0?'private':'public',i%3===0?daycare:mobile,i===0?10:i===1?1:i===2?8:null]);
    }
    const as=async(role,id='')=>{await db.exec('reset role;set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    await as('authenticated',owner);
    await assert.rejects(db.query('update public.fd_dog_photos set quality_score=10 where id=$1',[ids[2]]),e=>e.code==='42501');
    await assert.rejects(db.query("insert into public.fd_dog_photos(owner_id,dog_id,image_data,quality_score) values($1,$2,'data:image/png;base64,YmFk',10)",[owner,dogA]),e=>e.code==='42501');
    await assert.rejects(db.query("insert into public.fd_dog_photos(owner_id,dog_id,image_data,uploader_type) values($1,$2,'data:image/png;base64,YmFk','groomer')",[owner,dogA]),e=>e.code==='42501');
    await db.query("insert into public.fd_grooms(owner_id,dog_id,service,plan) values($1,$2,'Bath','{\"date\":\"2026-11-19\",\"data\":{\"currentFace\":\"data:image/png;base64,dmlzaXQ=\"}}')",[owner,dogA]);
    const triggerPhoto=(await db.query("select visibility,uploader_type,quality_score from public.fd_dog_photos where image_data='data:image/png;base64,dmlzaXQ='")).rows[0];
    assert.deepEqual(triggerPhoto,{visibility:'private',uploader_type:'owner',quality_score:null});
    await as('anon');
    await assert.rejects(db.query('select * from public.fd_gallery_source'),e=>e.code==='42501');
    await assert.rejects(db.query('select * from public.fd_dog_photos'),e=>e.code==='42501');
    const items=async(city=null,provider=null,by='all',time=null,id=null)=>(await db.query('select * from public.fd_gallery_items($1,$2,$3,$4,$5)',[city,provider,by,time,id])).rows;
    const first=await items();assert.equal(first.length,13);
    const page=first.slice(0,12),last=page.at(-1),rest=await items(null,null,'all',last.created_at,last.id);
    const all=[...page,...rest];assert.equal(all.length,17);assert.equal(new Set(all.map(p=>p.id)).size,17);
    assert.ok(!all.some(p=>[ids[0],ids[1]].includes(p.id)));assert.ok(!JSON.stringify(all).includes('private phone'));assert.ok(!JSON.stringify(all).includes(owner));
    assert.ok(!Object.keys(first[0]).some(k=>['quality_score','image_data','owner_id','dog_id'].includes(k)));
    assert.ok((await items(null,null,'groomer')).every(r=>r.uploader_type==='groomer'));
    assert.ok((await items(null,null,'owner')).every(r=>r.uploader_type==='owner'));
    const tampa=await items('tampa-fl');assert.ok(tampa.length>0);assert.ok(tampa.every(r=>r.provider_id===mobile));
    assert.deepEqual((await items('st-petersburg-fl')).map(r=>r.id),tampa.map(r=>r.id));
    assert.ok((await items(null,daycare)).every(r=>r.provider_id===daycare));
    await assert.rejects(items(null,null,'admin'));await assert.rejects(items('tampa-fl',mobile));await assert.rejects(items(null,null,'all',new Date().toISOString(),null));
    const featured=(await db.query('select * from public.fd_gallery_featured()')).rows;assert.equal(featured.length,8);assert.equal(featured[0].id,ids[2]);assert.equal(new Set(featured.map(r=>r.id)).size,8);
    assert.equal((await db.query('select * from public.fd_gallery_image($1)',[ids[0]])).rows.length,0);
    assert.equal((await db.query('select * from public.fd_gallery_image($1)',[ids[1]])).rows.length,0);
    assert.equal((await db.query('select * from public.fd_gallery_image($1)',[ids[2]])).rows.length,1);
    assert.equal((await db.query("select * from public.fd_gallery_locations('St Pete')")).rows[0].id,'st-petersburg-fl');
    assert.equal((await db.query("select * from public.fd_gallery_locations('Tampa FL')")).rows[0].id,'tampa-fl');
    assert.equal((await db.query("select * from public.fd_gallery_locations('Pending')")).rows.length,0);
    assert.equal((await db.query("select * from public.fd_gallery_locations('', 'provider', $1)",[daycare])).rows[0].label,'Happy Daycare');
    assert.equal((await db.query("select * from public.fd_gallery_locations('%')")).rows.length,0);
    await as('authenticated',owner);await db.query("update public.fd_dog_photos set visibility='private' where id=$1",[ids[2]]);
    await as('anon');assert.equal((await db.query('select * from public.fd_gallery_image($1)',[ids[2]])).rows.length,0);
    const after=(await db.query('select * from public.fd_gallery_featured()')).rows;assert.equal(after.length,8);assert.ok(!after.some(r=>r.id===ids[2]));
    await db.exec('reset role');await assert.rejects(db.query('update public.fd_dog_photos set quality_score=11 where id=$1',[prior]),e=>e.code==='23514');
  }finally{await db.close();}
});
