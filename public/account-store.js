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
    client.from('fd_owner_profiles').select('*').eq('owner_id',id).maybeSingle(),
    client.from('fd_dogs').select('id,owner_id,name,breed,birthday,care_defaults').eq('owner_id',id).order('created_at')
  ]);
  return {profile:result(profile),dogs:result(dogs)};
}
export async function findDirectoryCities(query) {
  return result(await client.rpc('fd_find_directory_cities',{p_query:query}));
}
export async function searchDirectory(city,query='',service='grooming',mode='all',offset=0) {
  return result(await client.rpc('fd_search_directory',{p_city_id:city,p_query:query,p_service:service,p_mode:mode,p_offset:offset}));
}
export async function saveDirectoryGroomer(businessId) {
  return result(await client.rpc('fd_save_directory_groomer',{p_business_id:businessId}).single());
}
export async function submitDirectoryGroomer(contactId,contact,cityId,cityText,services,locations,serviceArea) {
  return result(await client.rpc('fd_submit_directory_groomer',{p_contact_id:contactId,p_contact:contact,p_city_id:cityId,p_city_text:cityText,p_services:services,p_locations:locations,p_service_area:serviceArea}).single());
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
export async function historyFor(owner, dog, offset=0, count=historyPageSize+1) {
  return result(await client.from('fd_grooms').select('id,service,visit_date,created_at').eq('owner_id',owner).eq('dog_id',dog)
    .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+count-1));
}
export async function groomersFor(owner) {
  return result(await client.from('fd_groomers').select('id,name,business,address,email,phone').eq('owner_id',owner).order('name'));
}
export async function saveGroomer(owner,id,values,isNew) {
  if(isNew) {
    const added=await client.from('fd_groomers').insert({id,owner_id:owner,...values});
    if(added.error?.code!=='23505') {result(added);return;}
  }
  result(await client.from('fd_groomers').update(values).eq('owner_id',owner).eq('id',id).select('id').single());
}
export async function saveCare(owner,id,careDefaults) {
  result(await client.from('fd_dogs').update({care_defaults:careDefaults}).eq('owner_id',owner).eq('id',id).select('id').single());
}
export async function photosFor(owner,dog,offset=0) {
  return result(await client.from('fd_dog_photos').select('*').eq('owner_id',owner).eq('dog_id',dog)
    .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+11));
}
export async function photoFor(owner,dog,id) {
  return result(await client.from('fd_dog_photos').select('*').eq('owner_id',owner).eq('dog_id',dog).eq('id',id).single());
}
export async function findPhotoProviders(query) {
  return result(await client.rpc('fd_find_photo_providers',{p_query:query}));
}
export async function savePhoto(owner,dog,id,image,caption,visibility='private',providerId=null) {
  let inserted=await client.from('fd_dog_photos').insert({id,owner_id:owner,dog_id:dog,image_data:image,caption,visibility,provider_id:providerId});
  // Preserve private uploads before migration 006; never discard a sharing choice or tag.
  if(['PGRST204','42703'].includes(inserted.error?.code) && visibility==='private' && !providerId)
    inserted=await client.from('fd_dog_photos').insert({id,owner_id:owner,dog_id:dog,image_data:image,caption});
  if(inserted.error?.code==='23505')throw Error('This photo is already in the lookbook. Open it there to change its caption, sharing or provider tag.');
  result(inserted);
}
export async function updatePhoto(owner,dog,id,caption,visibility,providerId) {
  result(await client.from('fd_dog_photos').update({caption,visibility,provider_id:providerId})
    .eq('owner_id',owner).eq('dog_id',dog).eq('id',id).select('id').single());
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
