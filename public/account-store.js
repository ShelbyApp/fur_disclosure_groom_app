import {historyPageSize} from './profile-model.js';

const config = globalThis.FD_CONFIG || {};
export const configured = Boolean(config.publishableKey && globalThis.supabase?.createClient);
export const client = configured ? globalThis.supabase.createClient(config.url, config.publishableKey, {
  auth: {storageKey:'fd-owner-session-v1', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'implicit'}
}) : null;

function result(response) {
  if (response.error) throw response.error;
  return response.data;
}

export async function household(id) {
  const [profile, dogs] = await Promise.all([
    client.from('fd_owner_profiles').select('owner_id,display_name,phone').eq('owner_id',id).maybeSingle(),
    client.from('fd_dogs').select('id,owner_id,name,breed,birthday,care_defaults').eq('owner_id',id).order('created_at')
  ]);
  return {profile:result(profile),dogs:result(dogs)};
}
export async function saveOwner(id, values) {
  const inserted=await client.from('fd_owner_profiles').insert({owner_id:id,...values});
  if (inserted.error?.code==='23505') result(await client.from('fd_owner_profiles').update(values).eq('owner_id',id).select('owner_id').single());
  else result(inserted);
}
export async function saveDog(owner, id, values, isNew) {
  if (isNew) {
    const added=await client.from('fd_dogs').insert({id,owner_id:owner,...values});
    if (!added.error || added.error.code!=='23505') {result(added);return;}
  }
  result(await client.from('fd_dogs').update(values).eq('owner_id',owner).eq('id',id).select('id').single());
}
export async function historyFor(owner, dog, offset=0) {
  return result(await client.from('fd_grooms').select('id,service,visit_date,created_at').eq('owner_id',owner).eq('dog_id',dog)
    .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+historyPageSize));
}
export async function openGroom(owner,dog,id) {
  return result(await client.from('fd_grooms').select('id,dog_id,service,visit_date,created_at,plan').eq('owner_id',owner).eq('dog_id',dog).eq('id',id).single());
}
export async function saveGroom(owner,dog,id,prior,plan) {
  const row={id,owner_id:owner,dog_id:dog,copied_from:prior||null,service:plan.data.service,visit_date:plan.data.visit||null,plan};
  const inserted=await client.from('fd_grooms').insert(row);
  if (inserted.error?.code==='23505') return openGroom(owner,dog,id);
  result(inserted);return row;
}
