import {historyPageSize} from './profile-model.js';

const config = globalThis.FD_CONFIG || {};
export const configured = Boolean(config.publishableKey && globalThis.supabase?.createClient);
export const client = configured ? globalThis.supabase.createClient(config.url, config.publishableKey, {
  auth: {storageKey:'fd-owner-session-v1', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit'}
}) : null;

const demoKey = 'fd:example-household';
export const demoOwner = 'example-owner';
export const isDemo = id => id === demoOwner;
export function demoActive() {return sessionStorage.getItem('fd:example-active') === 'yes';}
export function enableDemo(value) {
  if (value) sessionStorage.setItem('fd:example-active','yes');
  else sessionStorage.removeItem('fd:example-active');
}
function sample() {
  const raw = sessionStorage.getItem(demoKey);
  if (raw) return JSON.parse(raw);
  const dog = {id:'sample-milo', owner_id:demoOwner, name:'Milo', breed:'Goldendoodle', birthday:'2022-05-14',
    care_defaults:{anxiety:'A little nervous', time:'Ask me first', fees:'Ask before any added fee'}};
  const profile = {owner_id:demoOwner,display_name:'Alex',phone:''};
  const date = new Date().toISOString();
  const plan = {date,status:'Owner request · not agreed',data:{name:dog.name,breed:dog.breed,mode:'advanced',service:'Bath + haircut',head:'Rounded',body:'Medium',coat:'No tangles noticed',
    mats:'Contact me before changing the cut',distress:'Pause and contact me',unreachable:'Complete only work already agreed',...dog.care_defaults,
    guide:'doodle',pins:{sensitiveMap:[{x:55,y:52,area:'Side / belly',note:'Brush gently on the left side.'}]}}};
  const value = {profile, dogs:[dog], grooms:[{id:'sample-visit',owner_id:demoOwner,dog_id:dog.id,created_at:date,service:plan.data.service,plan}]};
  sessionStorage.setItem(demoKey,JSON.stringify(value));return value;
}
function storeSample(value) {sessionStorage.setItem(demoKey, JSON.stringify(value));}
function result(response) {
  if (response.error) throw response.error;
  return response.data;
}

export async function household(id) {
  if (isDemo(id)) {const {profile,dogs}=sample();return {profile,dogs};}
  const [profile, dogs] = await Promise.all([
    client.from('fd_owner_profiles').select('owner_id,display_name,phone').eq('owner_id',id).maybeSingle(),
    client.from('fd_dogs').select('id,owner_id,name,breed,birthday,care_defaults').eq('owner_id',id).order('created_at')
  ]);
  return {profile:result(profile),dogs:result(dogs)};
}
export async function saveOwner(id, values) {
  if (isDemo(id)) {const db=sample();db.profile={...db.profile,...values};storeSample(db);return;}
  const inserted=await client.from('fd_owner_profiles').insert({owner_id:id,...values});
  if (inserted.error?.code==='23505') result(await client.from('fd_owner_profiles').update(values).eq('owner_id',id).select('owner_id').single());
  else result(inserted);
}
export async function saveDog(owner, id, values, isNew) {
  if (isDemo(owner)) {
    const db=sample();const item={id,owner_id:owner,...values};
    db.dogs=[...db.dogs.filter(dog=>dog.id!==id),item];storeSample(db);return;
  }
  if (isNew) {
    const added=await client.from('fd_dogs').insert({id,owner_id:owner,...values});
    if (!added.error || added.error.code!=='23505') {result(added);return;}
  }
  result(await client.from('fd_dogs').update(values).eq('owner_id',owner).eq('id',id).select('id').single());
}
export async function historyFor(owner, dog, offset=0) {
  if (isDemo(owner)) return sample().grooms.filter(row=>row.dog_id===dog).slice(offset,offset+historyPageSize+1);
  return result(await client.from('fd_grooms').select('id,service,visit_date,created_at').eq('owner_id',owner).eq('dog_id',dog)
    .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+historyPageSize));
}
export async function openGroom(owner,dog,id) {
  if (isDemo(owner)) {
    const row=sample().grooms.find(g=>g.id===id&&g.dog_id===dog);
    if (!row) throw Error('This groom could not be found.');
    return row;
  }
  return result(await client.from('fd_grooms').select('id,dog_id,service,visit_date,created_at,plan').eq('owner_id',owner).eq('dog_id',dog).eq('id',id).single());
}
export async function saveGroom(owner,dog,id,prior,plan) {
  const row={id,owner_id:owner,dog_id:dog,copied_from:prior||null,service:plan.data.service,visit_date:plan.data.visit||null,plan};
  if (isDemo(owner)) {
    const db=sample();
    if (!db.grooms.some(g=>g.id===id)) {db.grooms.unshift({...row,created_at:new Date().toISOString()});storeSample(db);}
    return openGroom(owner,dog,id);
  }
  const inserted=await client.from('fd_grooms').insert(row);
  if (inserted.error?.code==='23505') return openGroom(owner,dog,id);
  result(inserted);return row;
}
