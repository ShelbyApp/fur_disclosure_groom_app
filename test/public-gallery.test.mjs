import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
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
