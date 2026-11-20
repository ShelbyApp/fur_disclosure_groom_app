import {escapeHtml as esc} from './maps.js';
import {findPhotoProviders} from './account-store.js';

export const photoSettings = (photo={}) => `<fieldset class="photo-visibility"><legend>Who can see this photo?</legend>
  <label><input type="radio" name="visibility" value="private" ${photo.visibility!=='public'?'checked':''}><span><strong>Private</strong><small>Only in your dog’s lookbook.</small></span></label>
  <label><input type="radio" name="visibility" value="public" ${photo.visibility==='public'?'checked':''}><span><strong>Public</strong><small>Share with the Fur Disclosure community.</small></span></label>
  </fieldset><p class="hint photo-sharing-note">Public shares the photo, caption, dog’s name, breed, puppy/adult label and tagged provider. Your contact details and groom plans stay private.</p>
  <label class="entry"><span>Age in this photo</span><select name="life_stage" aria-describedby="photo-age-help"><option value="unknown" ${!photo.life_stage||photo.life_stage==='unknown'?'selected':''}>Not sure / not specified</option><option value="puppy" ${photo.life_stage==='puppy'?'selected':''}>Puppy</option><option value="adult" ${photo.life_stage==='adult'?'selected':''}>Adult</option></select></label><p id="photo-age-help" class="hint">Choose the life stage when the photo was taken, even if your dog is older now.</p>
  <section class="photo-provider" aria-label="Tag a provider">
  <label class="entry"><span>Tag a location or provider (optional)</span><input type="search" id="photo-provider-query" maxlength="80" autocomplete="off" placeholder="Business name or city" aria-describedby="photo-provider-status" aria-controls="photo-provider-results"></label>
  <div id="photo-provider-selected"></div><p id="photo-provider-status" class="hint" role="status">Search salons, mobile groomers, daycare and boarding.</p><div id="photo-provider-results"></div></section>`;

export function mountPhotoProvider(root, {initial=null, onChange, search=findPhotoProviders}) {
  let selected=initial,rows=[],timer,version=0,alive=true;
  const events=new AbortController(),el=name=>root.querySelector('#photo-provider-'+name);
  const status=text=>{el('status').textContent=text;};
  const paint=()=>{el('selected').innerHTML=selected?`<div class="provider-tag"><span><strong>${esc(selected.business_name)}</strong>${selected.location_label?'<small>'+esc(selected.location_label)+'</small>':''}</span><button type="button" class="text-action" data-remove-provider aria-label="Remove provider tag">×</button></div>`:'';};
  async function find() {
    const seq=++version,query=el('query').value.trim();
    if(query.replace(/[^a-z0-9]/gi,'').length<2){status('Type at least two letters to search.');return;}
    status('Finding providers…');
    try {
      const found=await search(query);if(!alive||seq!==version)return;
      rows=found.slice(0,8);
      el('results').innerHTML=rows.map((r,i)=>`<button class="provider-result" type="button" data-photo-provider="${i}"><strong>${esc(r.business_name)}</strong><small>${esc([r.location_label,r.services_label].filter(Boolean).join(' · '))}</small></button>`).join('');
      status(found.length>8?'More matches available. Add a city or more of the name.':rows.length?'Choose a provider to tag.':'No matches yet. Try a business name or city, or leave this blank.');
    } catch {if(alive&&seq===version)status('Search is unavailable. Try again, or add your photo without a tag.');}
  }
  root.addEventListener('input',event=>{
    if(event.target!==el('query'))return;
    version++;clearTimeout(timer);rows=[];el('results').innerHTML='';
    selected=null;paint();onChange(null);
    status('');timer=setTimeout(find,250);
  },{signal:events.signal});
  root.addEventListener('click',event=>{
    const choice=event.target.closest('[data-photo-provider]');
    if(choice) {
      selected=rows[Number(choice.dataset.photoProvider)];if(!selected)return;
      version++;clearTimeout(timer);el('query').value='';el('results').innerHTML='';
      paint();onChange(selected);status('Provider tagged.');
    }
    if(event.target.closest('[data-remove-provider]')) {
      selected=null;version++;clearTimeout(timer);paint();onChange(null);
      el('results').innerHTML='';el('query').value='';status('Provider tag removed.');el('query').focus();
    }
  },{signal:events.signal});
  paint();return ()=>{alive=false;version++;clearTimeout(timer);events.abort();};
}
