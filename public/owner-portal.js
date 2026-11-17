import {byId, decisionIds} from './flow.js';
import {escapeHtml as esc} from './maps.js';
import {decisions, icon, summary} from './views.js';
import {defaultFields, historyPageSize, validDefaults} from './profile-model.js';
import * as db from './account-store.js';

const routes = new Set(['account','profile','owner-settings','dog-profile','edit-dog','history','past-groom']);
export const isOwnerRoute = id => routes.has(id.split('/')[0]);
const link = (text, route, style='secondary') => `<a class="portal-link ${style}" href="#/${esc(route)}">${esc(text)}</a>`;
const action = (label, name, style='primary') => `<button type="button" class="${style}" data-owner-action="${name}">${esc(label)}</button>`;
const field = (label,name,value='',type='text',extra='') =>
  `<label class="entry"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const submit = label => `<button class="primary" type="submit">${esc(label)} →</button>`;
const dateLabel = value => new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const dateToday = () => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const settings = dog => defaultFields.map(key=>{
  const f=key==='anxiety'?byId.handling.fields[0]:byId[key].fields[0];
  return `<label class="entry"><span>${esc(decisions[key]?.[0] || 'Usual nervous level')}</span><select name="${key}"><option value="">Choose at each visit</option>${f.options.map(v=>'<option '+(dog?.care_defaults?.[key]===v?'selected':'')+'>'+esc(v)+'</option>').join('')}</select></label>`;
}).join('');
const petCard = dog => `<a class="pet-card" href="#/dog-profile/${esc(dog.id)}">${icon('pup')}<span><strong>${esc(dog.name)}</strong><small>${esc(dog.breed||'Dog profile')}</small></span><b>›</b></a>`;

export function ownerPortal({app, navigate, identityChanged, startVisit, hasDraft}) {
  let user=null, generation=0, current='', model=null, dog=null, past=null, newDogId=null, signedInError='';
  let sessionReady=false;
  const id = () => user?.id || null;
  const home = () => user?'profile':'account';
  const isSample = () => db.isDemo(id());

  function setIdentity(next) {
    if ((user?.id||null)===(next?.id||null)) return false;
    const previous=id();user=next;model=null;dog=null;past=null;generation++;
    identityChanged(previous,id());return true;
  }
  async function initialize() {
    if (db.client) {
      const {data,error}=await db.client.auth.getSession();
      if (error) signedInError='Your sign-in link could not be opened. Request a fresh link.';
      if (data?.session?.user) { db.enableDemo(false);setIdentity(data.session.user); }
      db.client.auth.onAuthStateChange((event,session)=>{
        // Supabase finishes its session lock before account data is fetched.
        setTimeout(()=>{
          if (!sessionReady || event==='INITIAL_SESSION') return;
          if (event==='SIGNED_OUT' || session?.user) {
            if (session?.user) db.enableDemo(false);
            if (setIdentity(session?.user||null)) navigate(home(),true);
          }
        },0);
      });
    }
    if (!user && db.demoActive()) setIdentity({id:db.demoOwner,email:''});
    sessionReady=true;
  }
  function frame(title,lead,body,back='',form='') {
    const logo='<img src="assets/fur-disclosure-logo-v9.png" alt="Fur Disclosure">';
    const content=form?`<form data-owner-form="${form}" class="portal-form">${body}</form>`:body;
    document.title=title+' · Fur Disclosure';
    app.innerHTML=`<header class="brandbar"><a class="brand" href="#/${home()}">${logo}</a><span class="app-name">${isSample()?'Sample profile':'Groom Planner'}</span></header>
      <main id="main" tabindex="-1" class="screen owner-screen">${back?link('← Back',back,'back'):''}<div class="heading"><h1 tabindex="-1">${esc(title)}<i class="burst"></i></h1></div>
      ${lead?'<p class="lead">'+esc(lead)+'</p>':''}${content}<p id="account-message" role="status"></p></main>`;
    app.querySelector('h1')?.focus({preventScroll:true});window.scrollTo(0,0);
  }
  function message(value) {const p=app.querySelector('#account-message');if(p)p.textContent=value;}
  function login() {
    const loginForm = db.configured
      ? `<form class="portal-form" data-owner-form="signin">${field('Email address','email','','email','required autocomplete="email"')}${submit('Email me a sign-in link')}</form>`
      : '<p class="hint">Email sign-in is awaiting setup. Explore the sample profile in this tab.</p>';
    frame('Your pups, all here.','Save their preferences and plan the next groom.',
      '<img class="garden" src="assets/studio-garden.jpg" alt="A groomed apricot dog in a garden">'+loginForm+
      action('Explore a sample profile','demo','secondary')+action('Plan one visit as a guest','guest','text-action')+link('Groomer’s copy','groomer-view','text-action'));
    if (signedInError) message(signedInError);
  }
  async function render(route) {
    current=route;const ticket=++generation;
    const [screen,dogId,recordId]=route.split('/');
    if (!user) {if(screen!=='account') {navigate('account',true);return;}login();return;}
    if (screen==='account') {navigate('profile',true);return;}
    frame('Your profile','Loading your pups…','');
    try {
      const household=await db.household(id());
      if (ticket!==generation) return;
      model=household;dog=model.dogs.find(d=>d.id===dogId);past=null;
      const profile=model.profile;
      if (screen==='owner-settings' || !profile?.display_name) {
        frame(profile?.display_name?'Owner details':'Meet the owner.','Your contact details can fill in future visits.',
          field('Your name','display_name',profile?.display_name||'','text','required maxlength="100" autocomplete="name"')+
          field('Phone (optional)','phone',profile?.phone||'','tel','maxlength="40" autocomplete="tel"')+
          submit('Save owner profile')+action('Sign out','signout','text-action'),profile?.display_name?'profile':'','owner');return;
      }
      if (screen==='profile') {
        frame('Your pups.','Choose a dog to plan a visit or see their groom history.',
          `<div class="owner-strip">${icon('groomer')}<strong>${esc(profile.display_name)}</strong>${link('Edit profile','owner-settings','text-action')}</div>`+
          (model.dogs.length?model.dogs.map(petCard).join(''):'<div class="empty">'+icon('pup')+'<h2>Add your first dog.</h2><p>Save their birthday and usual care preferences once.</p></div>')+
          link('＋ Add a dog','edit-dog/new','primary')+action(isSample()?'Leave sample profile':'Sign out','signout','text-action'));return;
      }
      if (screen==='edit-dog' && (dog || dogId==='new')) {
        newDogId=dog?.id || crypto.randomUUID();
        frame(dog?'Edit '+dog.name:'Meet your pup.','These details will fill in a fresh groom.',
          field('Dog’s name','name',dog?.name,'text','required maxlength="60"')+field('Breed or mix','breed',dog?.breed,'text','maxlength="180"')+
          field('Birthday (optional)','birthday',dog?.birthday,'date','max="'+dateToday()+'"')+
          '<details class="extra"><summary>Usual care & what-ifs</summary><div>'+settings(dog)+'</div></details>'+submit('Save dog'),
          dog?'dog-profile/'+dog.id:'profile','dog');return;
      }
      if (!dog) {navigate('profile',true);return;}
      const dogRoute='dog-profile/'+dog.id;
      if (screen==='dog-profile') {
        const choices=Object.entries(validDefaults(dog.care_defaults));
        frame(dog.name+'’s profile',dog.breed||'Your dog’s care and visits',
          `<div class="dog-identity">${icon('pup')}<div><strong>${esc(dog.name)}</strong><small>${dog.birthday?'Birthday · '+esc(dateLabel(dog.birthday)):'Birthday not set'}</small></div></div>
          ${link('Edit dog & care defaults','edit-dog/'+dog.id,'text-action')}
          ${choices.length?'<details class="recap"><summary>Usual care preferences</summary><dl>'+choices.map(([k,v])=>'<div class="fact"><dt>'+esc(decisions[k]?.[0]||'Nervous level')+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl></details>':''}
          ${hasDraft(id(),dog.id)?action('Resume groom','resume','secondary'):''}${action('Plan a new groom','start')}${link('Groom history','history/'+dog.id)}`,'profile');return;
      }
      if (screen==='history') {
        const offset=Math.max(0,parseInt(recordId,10)||0);
        const rows=await db.historyFor(id(),dog.id,offset);
        if(ticket!==generation)return;
        const cards=rows.slice(0,historyPageSize).map(row=>`<a class="pet-card" href="#/past-groom/${esc(dog.id)}/${esc(row.id)}">${icon('picture')}<span><strong>${esc(row.service)}</strong><small>${esc(dateLabel(row.visit_date||row.created_at))}</small></span><b>›</b></a>`).join('');
        frame(dog.name+'’s groom history','Open a visit to see the plan or make a copy.', (cards||'<div class="empty"><h2>No grooms here yet.</h2><p>Finish a plan to add the first visit.</p></div>')+
          (offset?link('Newer visits','history/'+dog.id+'/'+Math.max(0,offset-historyPageSize),'text-action'):'')+
          (rows.length>historyPageSize?link('Older visits','history/'+dog.id+'/'+(offset+historyPageSize),'text-action'):'')+
          action('Plan a new groom','start'),dogRoute);return;
      }
      if (screen==='past-groom') {
        const record=await db.openGroom(id(),dog.id,recordId);
        if(ticket!==generation)return;past=record;
        frame(record.service,dateLabel(record.visit_date||record.created_at),
          `<div class="past-actions">${action('Copy & edit this groom','copy')}${action('Print this plan','print','text-action')}</div>
          <article class="sheet"><div class="sheet-head"><h2>${esc(record.plan.data.name)}’s groom plan</h2><small>${esc(record.plan.status)}</small></div>${summary(record.plan.data,[1,2,3,4])}</article>`,'history/'+dog.id);return;
      }
      navigate('profile',true);
    } catch(error) {
      if(ticket!==generation)return;
      frame('Couldn’t open this profile.','Your saved records can be loaded again.',
        action('Try again','retry')+action('Sign out','signout','text-action'));
      message(problem(error));
    }
  }
  function problem(error) {
    if (['PGRST205','42P01'].includes(error?.code)) return 'The Fur Disclosure tables are awaiting setup.';
    return error?.message || 'Could not save. Check your connection and try again.';
  }
  const active = () => Boolean(app.querySelector('.owner-screen'));
  let request=0;
  async function work(task,control) {
    const seq=generation;
    if (request===seq) return;
    request=seq;if(control)control.disabled=true;
    try {await task(()=>seq===generation);}
    catch(e) {if(seq===generation)message(problem(e));}
    finally {if(request===seq)request=0;if(control)control.disabled=false;}
  }
  app.addEventListener('submit',event=>{
    const form=event.target.closest('[data-owner-form]');
    if (!form) return;
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    work(async valid=>{
      if (form.dataset.ownerForm==='signin') {
        const {error}=await db.client.auth.signInWithOtp({email:values.email.trim(),options:{emailRedirectTo:location.origin+location.pathname}});
        if(error)throw error;
        if(valid())message('Check your email for your Fur Disclosure sign-in link.');return;
      }
      if(form.dataset.ownerForm==='owner') {
        if(!values.display_name.trim())throw Error('Enter your name.');
        await db.saveOwner(id(),{display_name:values.display_name.trim(),phone:values.phone.trim()});
        if(valid())navigate('profile');return;
      }
      const dogId=newDogId;
      if(!values.name.trim())throw Error('Enter a name for your dog.');
      await db.saveDog(id(),dogId,{name:values.name.trim(),breed:values.breed.trim(),birthday:values.birthday||null,care_defaults:validDefaults(values)},!dog);
      if(valid())navigate('dog-profile/'+dogId);
    },form.querySelector('[type=submit]'));
  });
  app.addEventListener('click',event=>{
    const b=event.target.closest('[data-owner-action]');
    if (!b || !active()) return;
    work(async valid=>{
      switch(b.dataset.ownerAction) {
        case 'guest': startVisit(null,null,null,'guest');break;
        case 'demo': db.enableDemo(true);setIdentity({id:db.demoOwner,email:''});navigate('profile');break;
        case 'signout':
          if(!isSample() && db.client) {const {error}=await db.client.auth.signOut({scope:'local'});if(error)throw error;}
          db.enableDemo(false);setIdentity(null);navigate('account',true);break;
        case 'retry': if(valid())render(current);break;
        case 'print': window.print();break;
        default: {
          if (!dog || !model?.profile)return;
          startVisit(dog,{...model.profile,email:user.email},past,b.dataset.ownerAction);
        }
      }
    },b);
  });
  return {initialize, render, id, home, cancel(){generation++;}, isSample,
    saveVisit(state,plan){if(!user || user.id!==state.ownerId)throw Error('Sign in again to save this groom.');return db.saveGroom(user.id,state.dogId,state.recordId,state.copiedFrom,plan);}};
}
