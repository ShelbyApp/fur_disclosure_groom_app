import {advanced, byId, careMap, decisionIds, fieldsFor, guides, incomplete, intake, journey, snapshot, stages} from './flow.js';
import {editPin, escapeHtml as esc, mapView, movePointer, pointFromClick} from './maps.js';
import {button, contextArt, fields, icon, pup, roles, summary, welcome} from './views.js';
import {ownerPortal, isOwnerRoute} from './owner-portal.js';
import {beginVisit} from './profile-model.js';

const guestKey = 'fur-disclosure:groom:v1';
let key = guestKey;
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const fresh = () => ({answers:{}, resume:'dog', complete:null, editReturn:null, origin:null});
let state = fresh();
try {
  const saved = JSON.parse(sessionStorage.getItem(key));
  if (saved?.answers && byId[saved.resume]) {
    state = {...state, ...saved};
    if (!state.answers.mode && Object.keys(state.answers).length) state.answers.mode = 'advanced';
  }
} catch { /* A new tab can work entirely in memory. */ }
let data = state.answers;
let page, busy = false, stored = true;
const find = selector => document.querySelector(selector);
const special = id => decisionIds.includes(id) || ['spots','health'].includes(id);

const draftKey = (owner,dog) => 'fd:draft:'+owner+':'+dog;
function readDraft(storageKey) {
  try {return JSON.parse(sessionStorage.getItem(storageKey));} catch {return null;}
}
function switchDraft(storageKey, next) {
  key=storageKey;state=next || fresh();data=state.answers;
}
function hasDraft(owner,dog) {
  const saved=readDraft(draftKey(owner,dog));
  return Boolean(saved && !saved.complete && saved.answers.mode);
}
function identityChanged(oldId,newId) {
  busy=false;
  if(modal.open)modal.close();
  if(oldId) {
    for(const item of Object.keys(sessionStorage)) {
      if(item.startsWith('fd:draft:'+oldId+':'))sessionStorage.removeItem(item);
    }
    sessionStorage.removeItem('fd:active:'+oldId);
  }
  const active=newId && sessionStorage.getItem('fd:active:'+newId);
  const scoped=newId?draftKey(newId,active||'none'):guestKey;
  switchDraft(scoped,readDraft(scoped));
}
function startVisit(dog,owner,prior,action) {
  if(action==='guest') {sessionStorage.setItem('fd:guest-active','yes');switchDraft(guestKey,readDraft(guestKey));navigate('welcome');return;}
  const scoped=draftKey(owner.owner_id,dog.id);
  const saved=readDraft(scoped);
  const start=()=>{
    sessionStorage.setItem('fd:active:'+owner.owner_id,dog.id);
    if(action==='resume' && saved) {switchDraft(scoped,saved);navigate(state.resume);return;}
    const draft=beginVisit(dog,owner,action==='copy'?prior.plan:null);
    draft.copiedFrom=action==='copy'?prior.id:null;
    switchDraft(scoped,draft);save();
    navigate(action==='copy'?'review-look':'welcome');
  };
  if(action!=='resume' && hasDraft(owner.owner_id,dog.id)) {
    confirmAction('Replace this unfinished draft?','Your saved groom history will still be available.','Start this visit',start);
  } else start();
}
const portal=ownerPortal({app,navigate,identityChanged,startVisit,hasDraft});

function save() {
  try { sessionStorage.setItem(key, JSON.stringify(state)); stored = true; }
  catch { stored = false; }
  const status = find('#saved');
  if (status) status.textContent = stored ? '✓ Saved' : 'In memory';
}
function change(field, value) {
  if ((state.complete || state.pendingPlan) && state.ownerId) {
    if(state.complete) state.copiedFrom=state.recordId;
    state.recordId=crypto.randomUUID();state.pendingPlan=null;state.complete=null;
  }
  data[field] = value;
  if (!['checked','understood'].includes(field)) {
    data.checked = false; data.understood = false; state.complete = null;
  }
  save();
}
function missingStep(step) {
  if (step.id === 'what-ifs') return decisionIds.find(id => incomplete(byId[id],data));
  return incomplete(step,data);
}
function guard(id) {
  if (isOwnerRoute(id)) return id;
  if (!byId[id]) return portal.home();
  if (portal.id() && !state.dogId) return 'profile';
  if (!portal.id() && !['roles','groomer-view'].includes(id) && !sessionStorage.getItem('fd:guest-active') && !state.answers.mode) return 'account';
  if (['ready','sheet'].includes(id) && !state.complete) return 'welcome';
  if (!byId[id].stage) return id;
  if (!data.mode) return 'welcome';
  if (!intake(data).some(p=>p.id===id)) id = 'service';
  const list = journey(data);
  let anchor = id;
  if (decisionIds.includes(id)) anchor = 'what-ifs';
  if (id === 'spots') anchor = 'coat';
  if (id === 'health') anchor = 'handling';
  const index = list.findIndex(p=>p.id===anchor);
  const missing = list.slice(0,index).find(missingStep);
  return missing?.id || id;
}
function navigate(id, replace=false) {
  if (busy) return;
  const target = guard(id);
  history[replace?'replaceState':'pushState']({id:target},'', '#/'+target);
  render(target);
}
function fromHash() {
  const wanted = location.hash.startsWith('#/') ? location.hash.slice(2) : portal.home();
  const target = guard(wanted);
  if (target !== wanted) history.replaceState({id:target},'', '#/'+target);
  render(target);
}
const nextLabels = {'current-photos':'Today’s photos',service:'Choose a service',inspiration:'Show the look',finish:'Pick a finish',face:'Face & head',body:'Body & legs','ears-tail':'Ears & tail',coat:'Check the coat',handling:'Share care needs','what-ifs':'Set my what-ifs',contact:'Contact details','review-look':'Review my plan','review-care':'Final care check'};
function nextLabel() {
  if (page.id === 'review-care') return 'Finish my plan';
  if (state.editReturn && page.stage<5) return 'Save & return to review';
  if (special(page.id)) return page.id==='spots'?'Save spots & return':'Save & return';
  const list=journey(data), next=list[list.indexOf(page)+1];
  return nextLabels[next?.id] || 'Continue';
}
function titles(id) {
  const name=data.name?.trim();
  if (state.dogId && name && id==='dog') return name+'’s visit.';
  if (state.dogId && name && id==='welcome') return 'Plan '+name+'’s groom.';
  if (name && id==='handling') return 'How does '+name+' feel?';
  if (name && id==='ready') return name+'’s plan is ready.';
  if (name && id==='current-photos') return name+', as they are today.';
  return byId[id].title;
}
function top() {
  return `<header class="brandbar"><button class="brand" type="button" data-rolehome aria-label="Fur Disclosure home"><img src="assets/fur-disclosure-logo-v9.png" alt="Fur Disclosure"></button>
    ${page.stage?'<div class="status"><span id="saved" title="Saved in this browser tab">'+(stored?'✓ Saved':'In memory')+'</span><span>Step '+page.stage+' of 5</span></div>':'<span class="app-name">Groom Planner</span>'}</header>`;
}
function shellTitle(id) {
  let intro = page.intro;
  if (id==='ready') intro='Your owner request is ready to review with your groomer.';
  if (state.dogId && id==='dog') intro='Add the appointment details you know. You can leave them open for now.';
  if (state.ownerId && id==='contact') intro='Your profile filled these in. Choose what to share with the groomer.';
  return `<div class="heading"><h1 tabindex="-1">${esc(titles(id))}<i class="burst" aria-hidden="true"></i></h1></div><p class="lead">${esc(intro)}</p>`;
}
function outsideForm(id) {
  if (id==='roles') return roles();
  if (id==='welcome') return welcome(state);
  if (id==='ready') return `<div class="ticket"><strong class="stamp">✓</strong>${pup(state.complete.data)}<p>${state.ownerId?'Saved to groom history':'Owner request · ready to discuss'}</p></div>${button('View & print my plan →','data-go="sheet"')}${state.ownerId?button('View groom history','data-go="history/'+esc(state.dogId)+'"','secondary'):''}${button('Open groomer’s copy','data-go="groomer-view"','secondary')}`;
  if (!state.complete) return `<div class="empty">${icon('groomer')}<h2>No finished plan here yet.</h2><p>Finish an owner plan in this tab to see the groomer’s copy.</p></div>${button('Plan a groom →','data-go="welcome"')}`;
  const plan = state.complete, record=plan.data;
  return `<article class="sheet"><header class="sheet-head"><h2>${esc(record.name)}’s groom plan</h2><p>${advanced(record)?'Advanced':'Basic'} groom · ${esc(new Date(plan.date).toLocaleDateString())}</p><small>${esc(plan.status)}</small></header>${summary(record,[1,2,3,4])}</article>
  ${button('Print / save PDF','data-print')}${id==='sheet'?button('Review & edit','data-go="review-look"','secondary'):''}${button(state.ownerId?'Back to my dogs':'Back to planner home','data-rolehome','text-action')}`;
}
function render(id, focus=true) {
  if(isOwnerRoute(id)) {page=null;portal.render(id);return;}
  portal.cancel();
  page=byId[id]; if (page.stage) {state.resume=id; save();}
  const back = id==='roles'?'':button('← <span>Back</span>','data-back','back');
  const stage=page.stage;
  let content;
  if (stage) {
    const recap = id==='review-look' ? summary(data,[1,2],true) : id==='review-care' ? summary(data,[3,4],true) : '';
    content = contextArt(page,data) + recap + `<form id="fields"><div class="fields">${fields(page,data,Boolean(state.ownerId))}</div><p id="error" role="alert"></p>
      <footer class="actions"><button type="submit" class="primary" ${id==='review-care'&&(!data.checked||!data.understood)?'disabled':''}>${esc(nextLabel())} →</button>
      ${page.cut && id!=='ears-tail' && !state.editReturn ? button('Skip remaining look details','data-go="coat"','text-action') : ''}${button('Save & finish later','data-later','text-action')}</footer></form>`;
  } else content=outsideForm(id);
  document.title=titles(id)+' · Fur Disclosure';
  app.innerHTML=top()+`<main id="main" tabindex="-1" class="screen screen-${id}">${back}${shellTitle(id)}${content}</main>`;
  if (focus) {find('h1').focus({preventScroll:true}); window.scrollTo(0,0);}
}
function goBack() {
  if (special(page.id)) {returnFromDetail(); return;}
  if (state.editReturn && page.stage<5) {returnFromDetail(); return;}
  const list=journey(data), index=list.indexOf(page);
  if (page.id==='welcome' && state.ownerId) navigate('dog-profile/'+state.dogId);
  else if (index>=0) navigate(index?list[index-1].id:'welcome');
  else navigate(page.id==='sheet'?'ready':'account');
}
function returnFromDetail() {
  const dest=state.editReturn || state.origin || (page.id==='health'?'handling':'what-ifs');
  state.editReturn=null; state.origin=null; save(); navigate(dest);
}
function selectMode(mode) {
  if (!['basic','advanced'].includes(mode)) return;
  if (data.mode===mode) {navigate(state.complete?'sheet':state.resume); return;}
  change('mode',mode);
  if (mode==='basic' && data.priorities?.includes('Match my photo')) change('priorities',data.priorities.filter(p=>p!=='Match my photo'));
  state.origin=null; state.editReturn=null; navigate('dog');
}
function showError(msg) {const el=find('#error'); if(el) el.textContent=msg;}
function confirmAction(title,message,label,action) {
  modal.innerHTML=`<h2>${esc(title)}</h2><p>${esc(message)}</p>${button(esc(label),'data-confirm')}${button('Cancel','data-dismiss','text-action')}`;
  modal.querySelector('[data-dismiss]').onclick=()=>modal.close();
  modal.querySelector('[data-confirm]').onclick=()=>{modal.close();action();};
  modal.showModal();
}
function updateFinish(index) {
  const options=byId.finish.fields[0].options;
  change('finish',options[index]);
  const range=find('input[type=range]');
  range.value=index; range.setAttribute('aria-valuetext',options[index]);
  find('#range-label').textContent=options[index];
  app.querySelectorAll('[data-finish]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.finish)===index));
}
app.addEventListener('input',event=>{
  if(!page || busy)return;
  const el=event.target;
  if (page.id==='what-ifs' && decisionIds.includes(el.name)) {
    change(el.name,el.value);
    const panel=el.closest('details');
    panel.querySelector('summary small').textContent=el.value;
    panel.open=false;
    panel.querySelector('summary').focus({preventScroll:true});
    showError('');
    return;
  }
  const field=fieldsFor(page,data).find(f=>f.id===el.name);
  if (!field) return;
  if (field.type==='chips') {
    const picked=[...document.getElementsByName(field.id)].filter(i=>i.checked).map(i=>i.value);
    if (field.max && picked.length>field.max) {el.checked=false;showError('Choose up to '+field.max+' priorities.');return;}
    change(field.id,picked);
  } else if (field.type==='range') updateFinish(Number(el.value));
  else change(field.id,field.type==='check'?el.checked:el.value);
  showError('');
  if (page.id==='review-care') find('[type=submit]').disabled=!(data.checked&&data.understood);
});
function commitPhoto(key, value) {
  if (data.pins?.[key]) change('pins',{...data.pins,[key]:[]});
  change(key,value); render(page.id,false);
}
async function readPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024) throw Error('Choose a JPG, PNG or WebP under 12 MB.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,900/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.75);
  } finally {URL.revokeObjectURL(url);}
}
app.addEventListener('change',async event=>{
  const el=event.target;
  if (el.hasAttribute('data-guide') && guides[el.value] && !data.pins?.[careMap]?.length) {change('guide',el.value);render(page.id,false);return;}
  const key=el.dataset.photo;
  if (!key || !el.files[0] || busy || !advanced(data)) return;
  const sourcePage=page.id, visit=state;busy=true;
  try {
    const value=await readPhoto(el.files[0]);
    if (state!==visit || page?.id!==sourcePage) return;
    if (data.pins?.[key]?.length) {
      el.value='';confirmAction('Replace this photo?','Its attached notes will be cleared.','Replace photo',()=>commitPhoto(key,value));
    } else commitPhoto(key,value);
  } catch(err) {if(state===visit)showError(err.message.startsWith('Choose a')?err.message:'This photo could not be read. Try another image.');el.value='';}
  finally {if(state===visit)busy=false;}
});
app.addEventListener('submit',async event=>{
  if(!page || event.target.id!=='fields')return;
  event.preventDefault(); if (busy) return;
  const missing=incomplete(page,data);
  if (missing) {showError('Choose or enter '+missing.label.replace(/[…?.]$/,'')+' to continue.');document.getElementsByName(missing.id)[0]?.focus();return;}
  if (page.id==='what-ifs') {
    const next=decisionIds.find(id=>!data[id]);
    if (next) {
      const panel=find('[data-decision="'+next+'"]');
      panel.open=true;panel.querySelector('input').focus();
      showError('Choose a preference for each what-if to continue.');return;
    }
  }
  if (page.id==='review-care') {
    let plan=state.pendingPlan || snapshot(data);
    if(state.ownerId) {
      const attempt=state;
      busy=true;state.pendingPlan=plan;save();
      event.target.inert=true;
      const finish=event.target.querySelector('[type=submit]');finish.disabled=true;finish.textContent='Saving groom…';
      try {
        const saved=await portal.saveVisit(attempt,plan);
        if(state!==attempt || portal.id()!==attempt.ownerId)return;
        plan=saved.plan;
      } catch(error) {
        if(state===attempt){showError('Could not save to history. '+(error.message||'Please try again.'));finish.disabled=false;finish.textContent='Retry saving groom';}
        return;
      } finally {event.target.inert=false;if(state===attempt)busy=false;}
    }
    state.pendingPlan=null;state.complete=plan;state.editReturn=null;state.origin=null;save();navigate('ready');return;
  }
  if (special(page.id) || (state.editReturn && page.stage<5)) {returnFromDetail();return;}
  const list=journey(data);navigate(list[list.indexOf(page)+1].id);
});
function annotate(key,index,point) {
  editPin(modal,data,key,index,point,pins=>{
    change('pins',{...data.pins,[key]:pins});render(page.id,false);
    const target=[...app.querySelectorAll('[data-pin]')].find(b=>b.dataset.pin===key && Number(b.dataset.index)===Math.min(index<0?pins.length-1:index,pins.length-1));
    (target || app.querySelector('[data-map="'+key+'"]'))?.focus({preventScroll:true});
  });
}
app.addEventListener('keydown',movePointer);
app.addEventListener('click',event=>{
  const b=event.target.closest('button');
  if (!b || busy) return;
  const d=b.dataset;
  if(!page)return;
  if ('later' in d) {save();navigate(state.ownerId?'dog-profile/'+state.dogId:'account');}
  else if ('rolehome' in d) {state.editReturn=null;state.origin=null;save();navigate(portal.home());}
  else if (d.mode) selectMode(d.mode);
  else if ('resume' in d) navigate(state.resume);
  else if ('new' in d && state.ownerId) navigate('dog-profile/'+state.dogId);
  else if ('new' in d) confirmAction('Start a different visit?','Print a copy first if you want to keep this plan.','Start new visit',()=>{state=fresh();data=state.answers;save();navigate('welcome');});
  else if ('back' in d) goBack();
  else if (d.edit) {state.editReturn=page.id;state.origin=null;save();navigate(d.edit);}
  else if (d.visit) {state.origin=d.origin || page.id;save();navigate(d.visit);}
  else if (d.go) navigate(d.go);
  else if ('finish' in d) updateFinish(Number(d.finish));
  else if (d.map) annotate(d.map,-1,pointFromClick(event,b));
  else if (d.addPin) annotate(d.addPin,-1,{x:null,y:null});
  else if (d.pin) annotate(d.pin,Number(d.index),{});
  else if (d.zoom) {
    modal.innerHTML=mapView(d.zoom,data,'Photo and notes',false)+button('Close','data-dismiss','secondary');
    modal.querySelector('[data-dismiss]').onclick=()=>modal.close();modal.showModal();
  }
  else if (d.remove) confirmAction('Remove this photo?','The photo and any notes on it will be removed.','Remove photo',()=>commitPhoto(d.remove,undefined));
  else if ('print' in d) window.print();
});
window.addEventListener('beforeprint',()=>app.querySelectorAll('.sheet details').forEach(item=>item.open=true));
document.querySelector('.skip').onclick=event=>{event.preventDefault();find('#main').focus();};
portal.initialize().then(()=>{
  window.addEventListener('hashchange',fromHash);fromHash();
}).catch(()=>{
  window.addEventListener('hashchange',fromHash);navigate('account',true);
});

