import {breedSeed} from './breed-data.js';
import {escapeHtml as esc} from './maps.js';
let catalog=breedSeed,loaded=false;
const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export async function loadBreeds(client) {
  if(loaded||!client)return;
  try {
    const {data,error}=await client.from('fd_breeds').select('id,name,kind,aliases,sort_order').eq('active',true).order('sort_order').order('name').limit(1000).abortSignal(AbortSignal.timeout(2000));
    if(!error&&data?.some(b=>b.id==='unknown')){catalog=data;loaded=true;}
  } catch { /* Use the bundled catalog before migration, offline, or during an outage. */ }
}
export function canonicalBreed(value) {
  const normalized=key(value);
  return catalog.find(b=>key(b.name)===normalized||b.aliases.some(a=>key(a)===normalized))?.name||String(value||'').trim();
}
export function breedField(value='') {
  const ordered=[...catalog].sort((a,b)=>(a.sort_order??100)-(b.sort_order??100)||a.name.localeCompare(b.name));
  return `<label class="entry"><span>Breed or mix</span><input name="breed" type="text" list="fd-breed-options" value="${esc(value)}" maxlength="180" placeholder="Search breeds, or choose Unknown" autocomplete="off" aria-describedby="fd-breed-help"></label><datalist id="fd-breed-options">${ordered.map(b=>`<option value="${esc(b.name)}">${esc(b.aliases.filter(Boolean).join(', '))}</option>`).join('')}</datalist><p class="breed-help" id="fd-breed-help">Choose a breed, Mixed breed, or Unknown. You can also enter a mix that isn’t listed.</p>`;
}
