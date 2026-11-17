import {careMap, guides} from './flow.js';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const esc = escapeHtml;
const areas = ['Head / face', 'Ear', 'Neck / collar', 'Chest', 'Back', 'Side / belly', 'Leg', 'Paw', 'Tail', 'Other'];
export function photoSource(key, answers) {
  if (key === careMap) return (guides[answers.guide] || guides.doodle).image;
  return answers[key];
}

export function mapView(key, answers, label, editable = true) {
  const url = photoSource(key, answers);
  if (!url) return '';
  const pins = answers.pins?.[key] || [];
  const target = editable ? `<button type="button" class="map-target" data-map="${esc(key)}" aria-label="Add a note on ${esc(label)}. Use arrow keys to position the pointer, then press Enter."><i class="cursor" hidden></i></button>` : '';
  const marks = pins.map((pin,index) => {
    if (!Number.isFinite(pin.x) || !Number.isFinite(pin.y)) return '';
    const style = `left:${pin.x}%; top:${pin.y}%`;
    return editable
      ? `<button type="button" class="map-pin" style="${style}" data-pin="${esc(key)}" data-index="${index}" aria-label="Edit note ${index+1}">${index+1}</button>`
      : `<span class="map-pin" style="${style}">${index+1}</span>`;
  }).join('');
  const notes = pins.map((pin,index) => {
    const inside = `<b class="pin-number">${index+1}</b><span>${pin.area ? '<strong>'+esc(pin.area)+'</strong> ' : ''}${esc(pin.note)}</span>`;
    return editable
      ? `<button class="note-row" type="button" data-pin="${esc(key)}" data-index="${index}">${inside}<i>✎</i></button>`
      : `<div class="note-row">${inside}</div>`;
  }).join('');
  return `<figure class="photo-map"><div class="map-frame"><div class="map-surface"><img src="${esc(url)}" alt="${esc(label)}">${target}${marks}</div></div>
    <figcaption>${esc(label)}</figcaption></figure><div class="pin-list">${notes}</div>${editable ? '<button class="text-action" type="button" data-add-pin="'+esc(key)+'">＋ Add a note by area</button>' : ''}`;
}

export function pointFromClick(event, target) {
  if (!event.detail) return {x: Number(target.dataset.x || 50), y: Number(target.dataset.y || 50)};
  const box = target.getBoundingClientRect();
  const pct = value => Math.max(0, Math.min(100, Math.round(value * 1000) / 10));
  return {x: pct((event.clientX - box.left) / box.width), y: pct((event.clientY - box.top) / box.height)};
}

export function movePointer(event) {
  const target = event.target.closest('[data-map]');
  const delta = {ArrowLeft:[-5,0], ArrowRight:[5,0], ArrowUp:[0,-5], ArrowDown:[0,5]}[event.key];
  if (!target || !delta) return;
  event.preventDefault();
  const pos = {};
  for (const [index,key] of ['x','y'].entries()) {
    pos[key] = Math.max(0,Math.min(100,Number(target.dataset[key] || 50) + delta[index]));
    target.dataset[key] = pos[key];
  }
  const cursor = target.querySelector('.cursor');
  cursor.hidden = false;
  cursor.style.left = pos.x+'%';
  cursor.style.top = pos.y+'%';
}

export function editPin(dialog, answers, key, index, point, onChange) {
  const previous = answers.pins?.[key] || [];
  const pin = previous[index] || {...point, area:'', note:''};
  const editing = index >= 0;
  const care = key === careMap;
  dialog.innerHTML = `<form id="pin-form"><div class="dialog-title"><span class="pin-number">${editing ? index+1 : previous.length+1}</span><h2>${care?'A sensitive spot':'A photo note'}</h2></div>
    <label>Which area?<select name="area"><option value="">Choose an area (optional)</option>${areas.map(area=>'<option '+(area===pin.area?'selected':'')+'>'+esc(area)+'</option>').join('')}</select></label>
    <label>${care?'What should your groomer know?':'What do you want your groomer to see?'}<textarea required autofocus maxlength="350" name="note" rows="3" placeholder="${care?'e.g. A lump on her left side. Gentle brushing here.':'e.g. Keep the ears this long.'}">${esc(pin.note)}</textarea></label>
    <button class="primary" type="submit">Save note ✓</button><div class="dialog-links"><button type="button" data-dismiss>Cancel</button>${editing?'<button type="button" data-delete-pin>Delete note</button>':''}</div></form>`;
  const form = dialog.querySelector('form');
  form.onsubmit = event => {
    event.preventDefault();
    const note = form.elements.note.value.trim();
    if (!note) { form.elements.note.setCustomValidity('Add a note first.'); form.elements.note.reportValidity(); return; }
    const next = previous.slice();
    next[editing ? index : next.length] = {...pin, area:form.elements.area.value, note};
    dialog.close(); onChange(next);
  };
  form.elements.note.oninput = () => form.elements.note.setCustomValidity('');
  form.querySelector('[data-dismiss]').onclick = () => dialog.close();
  const remove = form.querySelector('[data-delete-pin]');
  if (remove) remove.onclick = () => {dialog.close(); onChange(previous.filter((_,i)=>i!==index));};
  dialog.showModal();
}
