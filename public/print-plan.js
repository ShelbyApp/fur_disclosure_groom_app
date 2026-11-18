import {advanced, careMap, guides, snapshot} from './flow.js';
import {escapeHtml as esc, mapView} from './maps.js';

const photoFields = [
  ['currentFace','Face today'], ['currentSide','Side today'], ['currentBack','Back today'],
  ['spotPhoto','Coat close-up'], ['reference','Desired look'], ['referenceTwo','Second desired look']
];
const lookFields = [
  ['finish','Finish'], ['style','Styling'], ['head','Head'], ['beard','Muzzle'], ['fringe','Eyes'],
  ['body','Body'], ['length','Remaining length'], ['legs','Legs'], ['paws','Paws'], ['ears','Ears'], ['tail','Tail'],
  ['faceNotes','Face notes'], ['bodyNotes','Body notes'], ['earNotes','Ear & tail notes']
];
const rules = [
  ['mats','Cut changes / mats'], ['time','Extra time'], ['fees','Extra fees'],
  ['distress','Distress'], ['unreachable','No reply']
];
const has = value => typeof value === 'string' ? Boolean(value.trim()) : Array.isArray(value) && value.length > 0;
const text = value => Array.isArray(value) ? value.join(', ') : value;
const dateLabel = value => {
  if (!value) return '';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00' : value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
};

// Reapply the visit's disclosure rules to older records as well as freshly finished plans.
export function printableData(plan) {
  return snapshot(plan?.data || {}).data;
}

function facts(data, fields) {
  return fields.filter(([key])=>has(data[key])).map(([key,label])=>
    `<p class="gs-fact"><strong>${esc(label)}:</strong> ${esc(text(data[key]))}</p>`
  ).join('');
}
function group(title, body, fallback='No details shared.') {
  return `<div class="gs-group"><h3>${esc(title)}</h3>${body || '<p class="gs-muted">'+esc(fallback)+'</p>'}</div>`;
}
function heading(number, label) {
  return `<h2 class="gs-section-title"><span>${number}</span>${label}</h2>`;
}

function sensitiveSpots(data) {
  const pins = data.pins?.[careMap] || [];
  const guide = guides[data.guide] || guides.doodle;
  const positioned = pin => Number.isFinite(pin.x) && Number.isFinite(pin.y) && pin.x>=0 && pin.x<=100 && pin.y>=0 && pin.y<=100;
  const markers = pins.map((pin,index)=>positioned(pin) ?
    `<span class="gs-map-pin" style="left:${pin.x}%;top:${pin.y}%">${index+1}</span>` : '').join('');
  const notes = pins.map((pin,index)=>`<li><b class="gs-note-number">${index+1}</b><div>${pin.area?'<strong>'+esc(pin.area)+'</strong>':''}<p>${esc(pin.note || '')}</p>${positioned(pin)?'':'<small>Area note · not pinned on guide</small>'}</div></li>`).join('');
  const legacy = facts(data,[['spotArea','Area'],['sensitive','Sensitive'],['spotNotes','What the owner noticed']]);
  if (!pins.length && !legacy) return group('Sensitive spots','<p class="gs-muted">No sensitive spots marked.</p>');
  return `<div class="gs-spots"><figure class="gs-guide"><div class="gs-guide-map"><img src="${guide.image}" alt="${esc(guide.label)} guide with owner-marked sensitive spots">${markers}</div><figcaption>Owner-marked guide · ${esc(guide.label)}</figcaption></figure><div><h3>Sensitive spots</h3>${notes?'<ol class="gs-spot-notes">'+notes+'</ol>':''}${legacy}</div></div>`;
}

function photoNotes(data) {
  const sources = facts(data,[['source','Reference source'],['likesPhoto','What to match']]);
  const notes = photoFields.filter(([key])=>data[key]).map(([key,label])=>{
    const pins = data.pins?.[key] || [];
    return pins.length ? `<div class="gs-photo-note-group">${pins.map((pin,i)=>
      `<p class="gs-photo-note"><strong>${esc(label)} #${i+1}${pin.area?' · '+esc(pin.area):''}:</strong> ${esc(pin.note || '')}</p>`).join('')}</div>` : '';
  }).join('');
  return sources + (notes ? '<div class="gs-photo-notes"><h3>Photo notes</h3>'+notes+'</div>' : '');
}

function photoAccess(data) {
  if (!photoFields.some(([key])=>data[key])) return photoNotes(data);
  // A non-scannable reserved space is deliberate until per-plan gallery sharing exists.
  // Never encode private records, a login-only URL, or a fabricated gallery destination.
  return `<aside class="gs-photo-access"><h3>View photos & callouts</h3><div class="gs-photo-link"><div class="gs-qr-reserved" aria-hidden="true"><span>QR</span><small>RESERVED</small></div><div><strong>Photo gallery</strong><p>QR sharing coming soon.</p><p class="gs-muted">Photos are available in the app.</p></div></div>${photoNotes(data)}</aside>`;
}

function lookRequest(data) {
  const details = lookFields.filter(([key])=>!['length','faceNotes','bodyNotes','earNotes'].includes(key) && has(data[key]));
  if (!has(data.body) && has(data.length)) details.push(['length','Remaining length']);
  const notes = facts(data,[['faceNotes','Face'],['bodyNotes','Body'],['earNotes','Ears & tail']]);
  const table = details.length || notes ? `<table class="gs-look-table"><caption>Look request</caption><colgroup><col style="width:29%"><col></colgroup><tbody>${details.map(([key,label])=>
    `<tr><th scope="row">${esc(label)}</th><td>${esc(data[key])}${key==='body' && has(data.length)?'; '+esc(data.length)+' remaining':''}</td></tr>`).join('')}${notes?'<tr><th scope="row">Notes</th><td>'+notes+'</td></tr>':''}</tbody></table>` :
    `<p class="gs-muted">${advanced(data)?'No detailed styling requests shared.':'Basic groom · confirm the service and finish together.'}</p>`;
  const photos = photoAccess(data);
  return `${has(data.priorityNote)?'<p class="gs-priority"><strong>Top priority:</strong> '+esc(data.priorityNote)+'</p>':''}<div class="gs-look ${photos?'gs-look-with-photos':''}"><div>${table}</div>${photos}</div>`;
}

function contacts(data) {
  const line = (label,values) => values.filter(has).length ? '<p><strong>'+esc(label)+':</strong> '+values.filter(has).map(esc).join(' · ')+'</p>' : '';
  const owner = data.includeContact ? line('Owner',[data.owner,data.channel && data.channel+' preferred'])+line('Contact',[data.phone,data.email])+line('Backup',[data.secondaryOwner,data.secondaryPhone]) : '';
  const groomer = line('Business / groomer',[data.salon,data.groomer])+line('Address',[data.groomerAddress])+line('Contact',[data.groomerPhone,data.groomerEmail]);
  return `<div class="gs-contacts">${group('Keep in touch',owner,data.includeContact?'No contact details shared.':'Contact details excluded by owner.')}${group('Grooming team',groomer,'Not specified for this visit.')}</div>`;
}

function screenPhotos(data) {
  const photos = photoFields.filter(([key])=>data[key]);
  if (!photos.length) return '';
  return `<details class="groom-screen-photos"><summary>View this groom’s photos (${photos.length})</summary><p>These photos stay in the app. Their notes are included in the printed plan.</p>${photos.map(([key,label])=>'<section class="groom-screen-photo"><h3>'+esc(label)+'</h3>'+mapView(key,data,label,false)+'</section>').join('')}</details>`;
}

export function groomPlan(plan) {
  const data = printableData(plan);
  const meta = [data.breed,data.age,data.weight].filter(has);
  const health = facts(data,[['allergies','Allergies'],['meds','Health / meds'],['mobility','Mobility'],['anxiety','Nervous level'],['comfortNotes','Comfort']]);
  const handling = facts(data,[['helps','Helps'],['triggers','Triggers'],['handlingNotes','Notes']]);
  const coat = facts(data,[['coat','Condition'],['lastGroom','Last groom'],['brushing','Home brushing'],['coatNotes','Coat notes']]);
  const expanded = (data.pins?.[careMap]?.length || 0)>4 || ['allergies','meds','mobility','comfortNotes','handlingNotes','coatNotes'].some(key=>String(data[key] || '').length>250) || (data.pins?.[careMap] || []).some(pin=>String(pin.note || '').length>200);
  return `<article class="groom-sheet${expanded?' gs-expanded':''}" aria-label="Printable groom plan">
    <div class="gs-running-header" aria-hidden="true">${esc(data.name || 'Your dog')} · ${advanced(data)?'Advanced':'Basic'} groom · ${esc(dateLabel(data.visit) || 'Visit date not specified')} · Owner request</div>
    <header class="gs-header"><img class="gs-logo" src="assets/fur-disclosure-logo-v9.png" alt="Fur Disclosure"><div class="gs-title"><h2>${esc(data.name || 'Your dog')}’s groom plan</h2><p>Visit: ${esc(dateLabel(data.visit) || 'Not specified')}</p><p class="gs-status">Owner request · review together before starting</p></div><strong class="gs-mode">${advanced(data)?'ADVANCED':'BASIC'}<br>GROOM</strong></header>
    <div class="gs-meta">${meta.length?'<span>'+esc(meta.join(' · '))+'</span>':''}${data.birthday?'<span>Birthday: '+esc(dateLabel(data.birthday))+'</span>':''}<span><strong>Service:</strong> ${esc(data.service || 'Not specified')}</span>${data.priorities?.length?'<span>'+esc(data.priorities.join(' · '))+'</span>':''}</div>
    <section class="gs-section gs-comfort">${heading('01','Check comfort')}<div class="gs-care"><div>${sensitiveSpots(data)}</div><div class="gs-care-facts">${group('Health & comfort',health)}${group('Handling',handling)}</div></div><div class="gs-coat">${group('Coat',coat)}</div></section>
    <section class="gs-section">${heading('02','Confirm the look')}${lookRequest(data)}</section>
    <section class="gs-section gs-decisions">${heading('03','Agree before changing')}<table class="gs-rule-table"><caption>Owner instructions if plans change</caption><colgroup><col style="width:29%"><col></colgroup><tbody>${rules.map(([key,label])=>
      `<tr><th scope="row">${label}</th><td>${has(data[key])?esc(data[key]):'<strong>Not specified · discuss before starting.</strong>'}</td></tr>`).join('')}</tbody></table><p class="gs-permission">Extra time does not approve extra fees or a different cut. No reply is not permission.</p></section>
    ${contacts(data)}<footer class="gs-footer">${dateLabel(plan?.date)?'Prepared '+esc(dateLabel(plan.date))+' · ':''}Owner request, not an agreement.</footer>
  </article>${screenPhotos(data)}`;
}

export async function printGroomPlan(root=document) {
  const sheet = root.querySelector('.groom-sheet');
  if (!sheet) return;
  await document.fonts.ready;
  await Promise.all([...sheet.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  window.print();
}
