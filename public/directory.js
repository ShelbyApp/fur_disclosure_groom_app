import {escapeHtml as esc} from './maps.js';
import * as db from './account-store.js';
const safeUrl=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export const directoryMarkup=()=>`<section class="directory" aria-label="Find a care provider">
  <label class="entry"><span>Where do you need service?</span><input id="directory-city" type="search" maxlength="100" placeholder="Start typing a city" autocomplete="off" aria-describedby="city-help" aria-controls="directory-cities"></label>
  <p id="city-help" class="hint">Choose a city to see salons and mobile providers serving that area.</p><div id="directory-cities" aria-label="Matching cities"></div>
  <div id="directory-filters" hidden><label class="entry"><span>Search business name</span><input id="directory-name" type="search" maxlength="100" placeholder="Start typing a business name" autocomplete="off"></label>
  <div class="directory-filter-row"><label class="entry"><span>Service</span><select id="directory-service"><option value="grooming">Grooming</option><option value="daycare">Daycare</option><option value="boarding">Boarding</option></select></label>
  <label class="entry"><span>Location</span><select id="directory-mode"><option value="all">All locations</option><option value="fixed_location">At a salon</option><option value="mobile">Mobile</option></select></label></div></div>
  <p id="directory-status" role="status" aria-live="polite"></p><div id="directory-results"></div><div id="directory-pages"></div>
  <p class="hint">Can’t find your groomer? Add their details to your saved contacts.</p><button type="button" class="secondary" data-directory-create>Add a missing groomer</button></section>`;
export function directoryCard(row) {
  const website=safeUrl(row.website_url),rating=Number(row.review_rating);
  const services=['grooming','daycare','boarding'].filter(k=>row.service_flags?.[k]===true);
  const modes=[row.location_flags?.fixed_location===true?'Salon':'',row.location_flags?.mobile===true?'Mobile':''].filter(Boolean);
  const supportedRating=row.rating_source&&!/(google|places[ _-]?api)/i.test(row.rating_source);
  return `<article class="directory-card"><h2>${esc(row.business_name)}</h2><p class="directory-tags">${esc([...modes,...services].join(' · '))}</p>
  ${row.address?'<p>'+esc(row.address)+'</p>':''}
  ${row.location_flags?.mobile===true?'<p class="hint">Serves '+esc(row.service_area||'the selected city')+'. Confirm your address with the provider.</p>':''}
  ${row.coverage_type==='nearby'?'<p class="hint">Nearby location, outside the selected city.</p>':''}
  ${supportedRating&&row.review_rating!=null&&rating>=1&&rating<=5?'<p class="directory-rating">'+rating.toFixed(1)+' / 5'+(row.review_count!=null?' · '+esc(row.review_count)+' reviews':'')+' · '+esc(row.rating_source)+'</p>':'<p class="hint">Rating unavailable</p>'}
  <div class="directory-contact">${row.phone?'<a href="tel:'+esc(row.phone.replace(/[^+0-9]/g,''))+'">'+esc(row.phone)+'</a>':''}${row.email?'<a href="mailto:'+esc(row.email)+'">Email</a>':''}${website?'<a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">Website</a>':''}</div>
  <button type="button" class="primary" data-directory-select="${esc(row.id)}">Select this business</button></article>`;
}
export function mountDirectory(root,{initialCity='',onSelect,onCreate}) {
  let city=null,cities=[],rows=[],offset=0,cityVersion=0,searchVersion=0,timer,alive=true,busy=false;
  const events=new AbortController(),listen=(element,event,fn)=>element.addEventListener(event,fn,{signal:events.signal});
  const el=id=>root.querySelector('#directory-'+id),status=text=>{if(alive)el('status').textContent=text;};
  const clear=()=>{el('results').innerHTML='';el('pages').innerHTML='';};
  async function search() {
    const version=++searchVersion;clear();if(!city)return;status('Finding businesses…');
    try {
      const found=await db.searchDirectory(city.id,el('name').value,el('service').value,el('mode').value,offset);
      if(!alive||version!==searchVersion)return;
      rows=found.slice(0,20);el('results').innerHTML=rows.map(directoryCard).join('');
      el('pages').innerHTML=(offset?'<button type="button" class="text-action" data-directory-page="previous">Previous results</button>':'')+(found.length>20?'<button type="button" class="text-action" data-directory-page="next">More results</button>':'');
      status(rows.length?`${city.name}, ${city.state} · ${offset+1}–${offset+rows.length}${found.length>20?' · more available':''}`:'No matching businesses in this city. Try another name or location filter, or add your groomer.');
    } catch {if(alive&&version===searchVersion){status('The directory couldn’t be loaded. Try again, or add your groomer.');el('pages').innerHTML='<button type="button" class="text-action" data-directory-retry>Try again</button>';}}
  }
  async function findCities() {
    const version=++cityVersion,query=el('city').value.trim();
    if(query.length<2){el('cities').innerHTML='';status('Enter at least two letters of a city.');return;}
    status('Finding cities…');
    try {
      const found=await db.findDirectoryCities(query);if(!alive||version!==cityVersion)return;
      cities=found;el('cities').innerHTML=cities.map(c=>`<button class="secondary directory-city-choice" type="button" data-directory-city="${esc(c.id)}">${esc(c.name)}, ${esc(c.state)}</button>`).join('');
      status(cities.length?'Select your city above.':'This city isn’t in our directory yet. You can still add your groomer.');
    } catch {if(alive&&version===cityVersion)status('City search is unavailable. Edit the city to try again, or add your groomer.');}
  }
  listen(el('city'),'input',()=>{city=null;offset=0;cityVersion++;searchVersion++;clear();el('filters').hidden=true;el('cities').innerHTML='';clearTimeout(timer);timer=setTimeout(findCities,250);});
  listen(el('name'),'input',()=>{searchVersion++;clear();offset=0;clearTimeout(timer);timer=setTimeout(search,250);});
  for(const name of ['service','mode'])listen(el(name),'change',()=>{clearTimeout(timer);offset=0;search();});
  listen(root,'click',async event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    if(button.dataset.directoryCity){city=cities.find(c=>c.id===button.dataset.directoryCity);if(!city)return;cityVersion++;el('city').value=city.name+', '+city.state;el('cities').innerHTML='';el('filters').hidden=false;offset=0;search();return;}
    if(button.hasAttribute('data-directory-create')){onCreate({city,cityText:el('city').value});return;}
    if(button.hasAttribute('data-directory-retry')){search();return;}
    if(button.dataset.directoryPage){offset=Math.max(0,offset+(button.dataset.directoryPage==='next'?20:-20));search();return;}
    if(button.dataset.directorySelect){const row=rows.find(r=>r.id===button.dataset.directorySelect);if(!row)return;busy=true;button.disabled=true;status('Saving this business…');
      try{await onSelect(row,()=>alive);}catch{status('This business couldn’t be saved. Please try again.');}finally{busy=false;if(alive)button.disabled=false;}}
  });
  if(initialCity){el('city').value=initialCity;findCities();}
  return ()=>{alive=false;cityVersion++;searchVersion++;clearTimeout(timer);events.abort();};
}
export const serviceFields=()=>`<fieldset class="directory-flags"><legend>Services offered (select all you know)</legend>${['grooming','daycare','boarding'].map(s=>`<label><input type="checkbox" name="service_${s}" ${s==='grooming'?'checked':''}> ${s[0].toUpperCase()+s.slice(1)}</label>`).join('')}</fieldset>
  <fieldset class="directory-flags"><legend>Service location (select all that apply)</legend><label><input type="checkbox" name="location_fixed_location"> Salon / fixed location</label><label><input type="checkbox" name="location_mobile"> Mobile / at home</label></fieldset>`;
export const flagsFromForm=(values,prefix,keys)=>Object.fromEntries(keys.map(k=>[k,values[prefix+k]==='on'?true:null]));
