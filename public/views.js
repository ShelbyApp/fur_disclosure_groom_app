import {advanced, byId, careMap, decisionIds, fieldsFor, guides, intake} from './flow.js';
import {escapeHtml as esc, mapView} from './maps.js';

export const button = (label, attrs, cls='primary') => `<button type="button" class="${cls}" ${attrs}>${label}</button>`;
export function icon(name) {
  return `<svg class="doodle" aria-hidden="true" viewBox="0 0 120 120"><use href="assets/parade-doodles.svg#${name}"></use></svg>`;
}
export const decisions = {
  mats:['Matting & cut changes','picture'], time:['Extra time','time'], fees:['Extra fees','cost'],
  distress:['If my pup gets nervous','comfort'], unreachable:['If I can’t be reached','groomer']
};
const names = {dog:'Your pup & visit', 'current-photos':'Today’s coat', service:'The service', inspiration:'Desired look',
  finish:'Overall finish', face:'Face & head', body:'Body, legs & paws','ears-tail':'Ears & tail',coat:'Coat condition',
  spots:'Sensitive spots', handling:'How grooming feels', health:'Health & comfort',contact:'Contact details'};
function labelFor(id) {return names[id] || decisions[id]?.[0] || byId[id].title;}
function artCard(title, subtitle, graphic, attrs, cls='') {
  return `<button type="button" class="art-card ${cls}" ${attrs}>${graphic}<span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span><b aria-hidden="true">→</b></button>`;
}
function garden() {
  return '<img class="garden" src="assets/studio-garden.jpg" alt="A fluffy apricot dog standing side-on in a garden">';
}
export function pup(data) {
  const own = advanced(data) && data.currentFace;
  return `<div class="pup"><img src="${esc(own||'assets/hero-pup-v3-720.jpg')}" alt="${own?'Current face photo':'Illustrative pup'}"><div><strong>${esc(data.name||'Your pup')}</strong><small>${esc([data.breed,data.groomer && 'with '+data.groomer].filter(Boolean).join(' · ') || (advanced(data)?'Advanced groom':'Basic groom'))}</small></div></div>`;
}
export function roles() {
  return garden()+artCard('I’m a dog owner','Open my profile or plan a guest visit.',icon('pup'),'data-go="account"','owner role')+
    artCard('I’m a groomer','Open a finished owner plan.',icon('groomer'),'data-go="groomer-view"','groomer role');
}
export function welcome(state) {
  const a = state.answers;
  const started = Boolean(a.mode);
  const resume = started ? `<div class="resume-box">${pup(a)}${button(state.complete?'Open finished plan →':'Continue this visit →',state.complete?'data-go="sheet"':'data-resume','secondary')}${button('Start a different visit','data-new','text-action')}</div>` : '';
  return resume + (!started ? (state.dogId ? petIdentity(a) : garden()) : '') + (started?'<h2>Planning options</h2>':'') +
    artCard('Basic groom','The service, comfort needs and what to do if plans change.',icon('comfort'),'data-mode="basic"','basic') +
    artCard('Advanced groom','All of Basic, plus photos, haircut details and notes on the look.',icon('picture'),'data-mode="advanced"','advanced');
}

function choices(field, data) {
  const multi = field.type === 'chips';
  const compact = multi || ['head','beard','fringe','body','legs','paws','ears','tail','channel'].includes(field.id);
  return `<div class="choices ${compact?'chips':'rows'}">${field.options.map(value=>{
    const checked = multi ? (data[field.id] || []).includes(value) : data[field.id] === value;
    return `<label class="choice"><input type="${multi?'checkbox':'radio'}" name="${field.id}" value="${esc(value)}" ${checked?'checked':''}><span>${esc(value)}</span></label>`;
  }).join('')}</div>`;
}
const fieldArt = {head:'paw',beard:'paw',fringe:'note',body:'length',length:'ruler',legs:'leg',paws:'paw',bodyNotes:'note',faceNotes:'note',earNotes:'note'};
function fieldHeading(field) {
  const art = fieldArt[field.id];
  return `${art?'<img class="field-art" src="assets/detail-'+art+'.jpg" alt="">':''}<span>${esc(field.label)}</span>`;
}
function photoField(field, data) {
  const key = field.id;
  const current = key.startsWith('current');
  const labels = {currentFace:'Face',currentSide:'Side',currentBack:'Back',reference:'Desired look',referenceTwo:'Another angle'};
  const label = labels[key] || field.label;
  const file = `<input type="file" data-photo="${key}" accept="image/jpeg,image/png,image/webp">`;
  if (data[key]) return `<section class="photo-field"><h3>${esc(label)}</h3>${mapView(key,data,'Tap the photo to add a note.')}
    <div class="photo-actions">${button('Enlarge','data-zoom="'+key+'"','text-action')}<label class="upload-link">Replace photo${file}</label>${button('Remove photo','data-remove="'+key+'"','text-action')}</div></section>`;
  return `<label class="upload-tile">${icon('picture')}<strong>＋ ${esc(label)}</strong><small>${current?'Current coat':'Groom reference'}</small>${file}</label>`;
}
function fieldView(field, data) {
  const value = data[field.id] ?? '', name = esc(field.id), label = esc(field.label);
  if (field.type === 'photo') return photoField(field,data);
  if (field.type === 'check') return `<label class="tick"><input type="checkbox" name="${name}" ${value?'checked':''}><span>${label}</span></label>`;
  if (field.type === 'range') {
    const i = field.options.indexOf(value);
    return `<fieldset class="group finish"><legend>${label}</legend><div class="range-value" id="range-label">${esc(value||'Choose a finish')}</div>
      <input type="range" name="${name}" min="0" max="4" step="1" value="${i<0?2:i}" aria-label="${label}" aria-valuetext="${esc(value||'No finish selected')}">
      <div class="range-ends"><span>Short & tidy</span><span>Long & fluffy</span></div><div class="finish-buttons">${field.options.map((v,j)=>button(esc(v),'data-finish="'+j+'" aria-pressed="'+(i===j)+'"','finish-pick')).join('')}</div></fieldset>`;
  }
  if (field.type === 'radio' || field.type === 'chips') {
    if (fieldArt[field.id]) {
      return `<fieldset class="detail-row"><legend class="visually-hidden">${label}</legend><div class="detail-inner"><img src="assets/detail-${fieldArt[field.id]}.jpg" alt=""><div><strong aria-hidden="true">${label}</strong>${choices(field,data)}</div></div></fieldset>`;
    }
    return `<fieldset class="group"><legend>${fieldHeading(field)}</legend>${choices(field,data)}</fieldset>`;
  }
  const attrs = `name="${name}" maxlength="${field.maxLength || (field.type==='note'?700:180)}" placeholder="${esc(field.hint)}" ${field.required?'required':''}`;
  return `<label class="entry">${fieldHeading(field)}${field.type==='note'?'<textarea '+attrs+' rows="2">'+esc(value)+'</textarea>':'<input type="'+field.type+'" '+attrs+' value="'+esc(value)+'">'}</label>`;
}
function extra(title, body, opened=false) {
  return `<details class="extra" ${opened?'open':''}><summary>${esc(title)}</summary><div>${body}</div></details>`;
}
function sensitiveLink(data, origin) {
  const count = data.pins?.[careMap]?.length || 0;
  return artCard('Mark a sensitive spot',count ? count+' saved '+(count===1?'note':'notes') : 'Point out a lump, sore paw or tender patch.',icon('pup'),'data-visit="spots" data-origin="'+origin+'"','map-link');
}
function guideMap(data) {
  const guide = guides[data.guide] || guides.doodle;
  const pinned = Boolean(data.pins?.[careMap]?.length);
  return `<div class="guide-heading"><strong>Guide dog</strong>${pinned?'<span>'+esc(guide.label)+'</span>':'<label>Body shape <select data-guide aria-label="Guide dog body shape">'+Object.entries(guides).map(([k,g])=>'<option value="'+k+'" '+(g===guide?'selected':'')+'>'+g.label+'</option>').join('')+'</select></label>'}</div>
    ${mapView(careMap,data,'Guide dog · '+guide.label)}
    <p class="hint">Include left or right in the note if it matters.</p>`;
}
function petIdentity(data) {
  const details = [data.breed, data.age, data.weight].filter(Boolean).join(' · ');
  return `<div class="dog-identity">${icon('pup')}<div><strong>${esc(data.name)}</strong><small>${esc(details)}</small></div></div>`;
}
export function fields(page, data, fromProfile=false) {
  const fs = fieldsFor(page,data);
  const render = list => list.map(f=>fieldView(f,data)).join('');
  if (page.id === 'dog' && fromProfile) {
    const identity = fs.filter(f=>['name','breed','birthday','age','weight'].includes(f.id));
    const visit = fs.filter(f=>['salon','groomer','visit'].includes(f.id));
    return petIdentity(data) + extra('Edit pet details for this visit',render(identity),!data.name) + render(visit);
  }
  if (page.id === 'contact' && fromProfile) {
    const contact = [data.owner,data.phone,data.email].filter(Boolean);
    return '<div class="contact-card">'+contact.map(item=>'<span>'+esc(item)+'</span>').join('')+'</div>'+
      extra('Edit contact for this visit',render(fs.filter(f=>['owner','phone','email'].includes(f.id))),!contact.length)+
      render(fs.filter(f=>['channel','includeContact'].includes(f.id)));
  }
  if (page.id === 'dog') return render(fs.slice(0,2)) + extra('Birthday, age & weight',render([fs[7],...fs.slice(2,4)]),Boolean(data.birthday||data.age||data.weight))+
    extra('Salon, groomer & visit date',render(fs.slice(4,7)),Boolean(data.salon||data.groomer||data.visit));
  if (page.id === 'spots') return guideMap(data) + (fs.length?extra('Previously saved spot details',render(fs)): '');
  if (page.id === 'handling') return render(fs.slice(0,3))+extra('Add a handling note',render(fs.slice(3)),Boolean(data.handlingNotes))+
    artCard('Health & comfort','Allergies, mobility or other care notes.',icon('comfort'),'data-visit="health" data-origin="handling"')+sensitiveLink(data,'handling');
  if (page.id === 'coat') return render(fs.slice(0,1)) + extra('Coat history & notes',render(fs.slice(1)),Boolean(data.lastGroom||data.brushing||data.coatNotes))+sensitiveLink(data,'coat');
  if (page.id === 'inspiration') {
    return render(fs.filter(f=>f.id==='reference'))+extra('Add another reference photo',render(fs.filter(f=>f.id==='referenceTwo')),Boolean(data.referenceTwo))+
      extra('Photo source & overall note',render(fs.filter(f=>!['reference','referenceTwo'].includes(f.id))),Boolean(data.source||data.likesPhoto));
  }
  if (page.id === 'what-ifs') {
    return decisionIds.map(id=>{
      const [title,art] = decisions[id];
      return `<details class="decision-panel" data-decision="${id}"><summary>${icon(art)}<span><strong>${esc(title)}</strong><small>${esc(data[id] || 'Choose a preference')}</small></span></summary>
        <fieldset><legend>${esc(byId[id].fields[0].label)}</legend>${choices(byId[id].fields[0],data)}</fieldset></details>`;
    }).join('') + sensitiveLink(data,'what-ifs');
  }
  if (page.id === 'current-photos') return '<div class="photo-grid">'+render(fs)+'</div>';
  return render(fs);
}

export function contextArt(page,data) {
  if (page.id === 'body') return garden();
  if (page.id === 'ears-tail') return '<div class="sample-pair"><img src="assets/guide-spaniel.jpg" alt="Sample spaniel with long ears"><img src="assets/guide-doodle.jpg" alt="Sample doodle with a fluffy tail"></div>';
  if (['service','finish','face','coat','handling','what-ifs','review-care'].includes(page.id)) return pup(data);
  if (decisionIds.includes(page.id)) return '<div class="decision-art">'+icon(decisions[page.id][1])+'</div>';
  return '';
}

export function summary(data, stages, editable=false) {
  return intake(data).filter(p=>stages.includes(p.stage) && p.stage<5 && p.id!=='what-ifs').map(page => {
    const rows = fieldsFor(page,data).filter(field=>{
      if (page.id==='contact' && !data.includeContact) return false;
      if (field.id==='includeContact') return false;
      const value=data[field.id];
      return value!==undefined && value!==false && value!=='' && (!Array.isArray(value)||value.length);
    }).map(field=>{
      const value=data[field.id];
      if (field.type==='photo') return mapView(field.id,data,field.label,false);
      const display = Array.isArray(value) ? value.filter(item=>!field.options || field.options.includes(item)).join(', ') : value;
      return display ? '<div class="fact"><dt>'+esc(field.label)+'</dt><dd>'+esc(display)+'</dd></div>' : '';
    }).join('');
    const pins = page.id==='spots' && data.pins?.[careMap]?.length ? mapView(careMap,data,'Sensitive spots · guide dog',false) : '';
    const missingContact = page.id==='contact' && !rows;
    if (!editable && !rows && !pins && !missingContact) return '';
    const edit = editable ? button('Edit','data-edit="'+page.id+'" aria-label="Edit '+esc(labelFor(page.id))+'"','edit') : '';
    const first = (rows || pins) ? '' : missingContact ? 'Contact details excluded' : 'No details added';
    const firstValue=fieldsFor(page,data).find(f=>f.type!=='photo'&&f.type!=='check'&&data[f.id]);
    const preview=first || (pins ? data.pins[careMap].length+' marked' : firstValue ? data[firstValue.id] : 'Photos');
    return `<details class="recap" ${editable?'':'open'}><summary><span>${esc(labelFor(page.id))}</span><small>${esc(preview)}</small></summary><div class="recap-content">${rows?'<dl>'+rows+'</dl>':''}${pins}${!rows&&!pins?'<p>'+first+'</p>':''}${edit}</div></details>`;
  }).join('');
}
