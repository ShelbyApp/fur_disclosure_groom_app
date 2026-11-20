import {byId, decisionIds} from './flow.js';
import {escapeHtml as esc} from './maps.js';
import {decisions, icon} from './views.js';
import {groomPlan, printGroomPlan} from './print-plan.js';
import {defaultFields, healthFields, historyPageSize, validDefaults} from './profile-model.js';
import * as db from './account-store.js';
import {readPhoto} from './photos.js';
import {directoryMarkup,mountDirectory,serviceFields,flagsFromForm} from './directory.js';
import {accountRole,signupIntent,signupOptions} from './signup-intent.js';
import {photoSettings,mountPhotoProvider} from './photo-settings.js';
import {breedField} from './breeds.js';

const routes = new Set(['account','create-account','forgot-password','set-password','profile','groomer-home','owner-settings','dog-profile','edit-dog','dog-care','edit-groomer','find-groomer','add-photo','edit-photo','history','past-groom']);
const entryRoutes = ['account','create-account','forgot-password'];
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
const healthSettings = dog => '<h2>Health & comfort</h2>'+healthFields.map(f=>
  f.type==='note'?`<label class="entry"><span>${esc(f.label)} (optional)</span><textarea name="${f.id}" maxlength="700" rows="2">${esc(dog?.care_defaults?.[f.id]||'')}</textarea></label>`:
    field(f.label+' (optional)',f.id,dog?.care_defaults?.[f.id],'text','maxlength="180"')
).join('');
const petCard = dog => `<a class="pet-card" href="#/dog-profile/${esc(dog.id)}">${icon('pup')}<span><strong>${esc(dog.name)}</strong><small>${esc(dog.breed||'Dog profile')}</small></span><b>›</b></a>`;
const groomCard = groomer => `<a class="pet-card groomer-card" href="#/edit-groomer/${esc(groomer.id)}">${icon('groomer')}<span><strong>${esc(groomer.name || groomer.business)}</strong><small>${esc(groomer.name?groomer.business || 'Independent groomer':'Saved business')}</small></span><b>›</b></a>`;
const historyCards = (rows,dogId) => rows.map(row=>`<a class="pet-card history-card" href="#/past-groom/${esc(dogId)}/${esc(row.id)}">${icon('picture')}<span><strong>${esc(row.service)}</strong><small>${esc(dateLabel(row.visit_date||row.created_at))}</small></span><b>›</b></a>`).join('');
const photoCard = (photo,dogId) => `<figure class="polaroid" data-photo-id="${esc(photo.id)}"><a href="#/edit-photo/${esc(dogId)}/${esc(photo.id)}" aria-label="Edit photo: ${esc(photo.caption||'Dog photo')}"><img src="${esc(photo.image_data)}" alt="${esc(photo.caption||'Dog photo')}" loading="lazy"><figcaption>${esc(photo.caption||dateLabel(photo.created_at))}<small>${photo.visibility==='public'?'Public':'Private'}${photo.provider_label?' · '+esc(photo.provider_label):''}</small></figcaption></a></figure>`;

export function ownerPortal({app, navigate, identityChanged, startVisit, hasDraft, getVisitContext, useGroomer}) {
  let user=null, generation=0, current='', model=null, dog=null, past=null, newDogId=null, signedInError='';
  let sessionReady=false;
  let groomers=[], editGroomer=null, photoDraft=null, photoOffset=0;
  let groomerReturn=null;
  let disposeDirectory=null;
  let disposePhotoProvider=null;
  let signupRole=signupIntent(location.href,sessionStorage);
  const directoryLocation=()=>{try{return JSON.parse(sessionStorage.getItem('fd:directory-city:'+id())||'null')||{};}catch{return {};}};
  const id = () => user?.id || null;
  const recovering = () => Boolean(user && sessionStorage.getItem('fd:password-recovery')===user.id);
  const profileHome = () => accountRole(user)==='groomer'?'groomer-home':'profile';
  const home = () => recovering()?'set-password':user?profileHome():'account';

  function setIdentity(next) {
    if ((user?.id||null)===(next?.id||null)) {user=next;return false;}
    const previous=id();user=next;model=null;dog=null;past=null;generation++;
    if (!next) sessionStorage.removeItem('fd:password-recovery');
    identityChanged(previous,id());return true;
  }
  async function initialize() {
    if (db.client) {
      const callback = new URLSearchParams(location.hash.slice(1));
      const resetLink = callback.get('type')==='recovery';
      if (callback.has('error') || callback.has('error_code')) signedInError='That email link has expired or is invalid. Request a new one.';
      const {data,error}=await db.client.auth.getSession();
      if (error) signedInError='Please sign in again or request a new password reset link.';
      if (data?.session?.user) setIdentity(data.session.user);
      if (resetLink && user && !error && !signedInError) sessionStorage.setItem('fd:password-recovery',id());
      db.client.auth.onAuthStateChange((event,session)=>{
        // Supabase finishes its session lock before account data is fetched.
        setTimeout(()=>{
          if (!sessionReady || event==='INITIAL_SESSION') return;
          if (event==='SIGNED_OUT' || session?.user) {
            const changed=setIdentity(session?.user||null);
            if(event==='PASSWORD_RECOVERY' && session?.user) sessionStorage.setItem('fd:password-recovery',session.user.id);
            if (changed || event==='PASSWORD_RECOVERY') navigate(home(),true);
          }
        },0);
      });
    }
    sessionReady=true;
  }
  function frame(title,lead,body,back='',form='') {
    const logo='<img src="assets/fur-disclosure-logo-v9.png" alt="Fur Disclosure">';
    const content=form?`<form data-owner-form="${form}" class="portal-form">${body}</form>`:body;
    document.title=title+' · Fur Disclosure';
    app.innerHTML=`<header class="brandbar"><a class="brand" href="#/${home()}">${logo}</a><span class="app-name">Groom Planner</span></header>
      <main id="main" tabindex="-1" class="screen owner-screen">${back?link('← Back',back,'back'):''}<div class="heading"><h1 tabindex="-1">${esc(title)}<i class="burst"></i></h1></div>
      ${lead?'<p class="lead">'+esc(lead)+'</p>':''}${content}<p id="account-message" role="status"></p></main>`;
    app.querySelector('h1')?.focus({preventScroll:true});window.scrollTo(0,0);
  }
  function message(value) {const p=app.querySelector('#account-message');if(p)p.textContent=value;}
  function login(screen) {
    const email = field('Email address','email','','email','required autocomplete="email"');
    const password = (label, name, autocomplete) => field(label,name,'','password','required autocomplete="'+autocomplete+'"');
    const hero='<img class="login-pup" src="assets/hero-pup-v2-720.jpg" alt="Our apricot pup after an unexpected haircut, on a sunny yellow background">';
    if (screen==='set-password') {
      frame('Choose a new password.','Use this password the next time you log in.',
        password('New password','password','new-password')+password('Confirm password','confirmation','new-password')+
        submit('Save password')+action('Sign out','signout','text-action'),'','set-password');
      return;
    }
    if (db.configured && screen==='create-account') {
      frame('Create your account.',signupRole==='groomer'?'A clearer start for you and your clients.':'A home for your pups and their plans.',
        hero+'<form class="portal-form" data-owner-form="create-account">'+
        email+password('Password','password','new-password')+password('Confirm password','confirmation','new-password')+
        '<label class="entry"><span>I’m here as a</span><select name="signup_role"><option value="owner" '+(signupRole==='owner'?'selected':'')+'>Dog owner</option><option value="groomer" '+(signupRole==='groomer'?'selected':'')+'>Groomer / salon</option></select></label>'+
        submit('Create account')+'</form>'+link('Already have an account? Log in','account','text-action'));
      app.querySelector('main').classList.add('auth-screen');
      return;
    }
    if (db.configured && screen==='forgot-password') {
      frame('Set or reset your password.','Enter your account email. We’ll send you a password reset link.',
        email+submit('Send reset link'),'account','forgot-password');return;
    }
    const loginForm = db.configured
      ? `<form class="portal-form" data-owner-form="signin">${email}${password('Password','password','current-password')}${submit('Log in')}</form>`+
        link('Forgot password?','forgot-password','text-action')+link('Create an account','create-account','secondary')+
        '<p class="login-version">Version: '+esc(globalThis.FD_CONFIG?.appVersion||'01.01')+'</p>'
      : '<p class="hint" role="status">Account sign-in is unavailable right now. Please try again shortly.</p>';
    frame('Your pups, all here.','Log in to plan a groom or find a past visit.',
      hero+loginForm);
    app.querySelector('main').classList.add('auth-screen');
    if (signedInError) message(signedInError);
  }
  async function render(route) {
    disposeDirectory?.();disposeDirectory=null;
    disposePhotoProvider?.();disposePhotoProvider=null;
    photoDraft=null;groomers=[];editGroomer=null;groomerReturn=null;
    current=route;const ticket=++generation;
    const [screen,dogId,recordId]=route.split('/');
    if (!user) {if(!entryRoutes.includes(screen)) {navigate('account',true);return;}login(screen);return;}
    if (screen==='set-password') {login(screen);return;}
    if (recovering() || entryRoutes.includes(screen)) {navigate(home(),true);return;}
    frame('Your profile','Loading your profile…','');
    try {
      const household=await db.household(id());
      if (ticket!==generation) return;
      model=household;dog=model.dogs.find(d=>d.id===dogId);past=null;
      const profile=model.profile;
      const isGroomer=accountRole(user)==='groomer';
      if (screen==='owner-settings' || !profile?.display_name) {
        frame(profile?.display_name?'Your contact details':isGroomer?'First, a little about you.':'First, meet the owner.',profile?.display_name?'Keep your profile up to date.':isGroomer?'Save your details to get started.':'Save your contact details, then add your first dog.',
          field('Your name','display_name',profile?.display_name||'','text','required maxlength="100" autocomplete="name"')+
          field('Sign-in email','account_email',user.email,'email','readonly autocomplete="email"')+
          field('Phone (optional)','phone',profile?.phone||'','tel','maxlength="40" autocomplete="tel"')+
          field('City (optional)','city',profile?.city||'','text','maxlength="100" autocomplete="address-level2"')+
          field('State (optional)','state',profile?.state||'','text','maxlength="100" autocomplete="address-level1"')+
          submit(profile?.display_name?'Save changes':isGroomer?'Save my profile':'Save & add my first dog')+
          (profile?.display_name?link('Set or change password','set-password','text-action'):''),profile?.display_name?profileHome():'','owner');return;
      }
      if(screen==='groomer-home') {
        if(!isGroomer){navigate('profile',true);return;}
        frame('Good to meet you, '+profile.display_name+'.','Your groomer profile is saved.',
          '<div class="groomer-welcome">'+icon('groomer')+'<h2>Clearer check-ins are coming.</h2><p>We’re building custom intake forms and a shared view of each dog’s look, care needs and what-ifs.</p><span class="feature-status">Groomer tools · coming soon</span></div>'+
          link('Edit my profile','owner-settings','secondary')+'<section class="profile-section"><h2>Have pups of your own?</h2><p>You can plan their next groom today.</p>'+link('My dogs & groom plans','profile','primary')+'</section>'+action('Sign out','signout','text-action'));return;
      }
      if (screen==='profile') {
        const contacts=await db.groomersFor(id()).catch(()=>null);
        if(ticket!==generation)return;
        frame('Your profile.','Your dogs and the people who care for them.',
          `<div class="owner-strip">${icon('groomer')}<strong>${esc(profile.display_name)}</strong>${link('Edit profile','owner-settings','text-action')}</div>`+
          '<h2>Your dogs</h2>'+
          (model.dogs.length?model.dogs.map(petCard).join(''):'<div class="empty">'+icon('pup')+'<h2>Add your first dog.</h2><p>Save their birthday and usual care preferences once.</p></div>')+
          link('＋ Add a dog','edit-dog/new','primary')+
          '<section class="profile-section"><h2>Your groomers</h2>'+
          (contacts?contacts.map(groomCard).join('')||'<p class="hint">Keep your favorite people and salons here.</p>':'<p role="status">Your groomers couldn’t be loaded. Try again shortly.</p>')+
          link('Find or add a groomer','find-groomer/new','secondary')+'</section>'+(isGroomer?link('My groomer profile','groomer-home','text-action'):'')+action('Sign out','signout','text-action'));return;
      }
      if(screen==='find-groomer') {
        const visit=getVisitContext();
        const returnTo=recordId==='visit'&&visit?.ownerId===id()?visit:null;
        frame('Find your groomer.','Start with the city where you need service.',directoryMarkup(),returnTo?'dog':'profile');
        disposeDirectory=mountDirectory(app.querySelector('.directory'),{
          initialCity:directoryLocation().city?.name||directoryLocation().cityText||profile.city||'',
          onSelect:async(row,alive)=>{
            const contact=await db.saveDirectoryGroomer(row.id);
            if(!alive()||ticket!==generation)return;
            if(!(returnTo&&useGroomer(contact,returnTo)))navigate('profile');
          },
          onCreate:location=>{
            sessionStorage.setItem('fd:directory-city:'+id(),JSON.stringify(location));
            navigate('edit-groomer/new'+(returnTo?'/visit':''));
          }
        });return;
      }
      if(screen==='edit-groomer') {
        groomers=await db.groomersFor(id());
        if(ticket!==generation)return;
        editGroomer=groomers.find(g=>g.id===dogId)||null;
        if(dogId!=='new'&&!editGroomer){navigate('profile',true);return;}
        newDogId=editGroomer?.id||crypto.randomUUID();
        const visit=getVisitContext();
        if(dogId==='new' && recordId==='visit' && visit?.ownerId===id())groomerReturn=visit;
        frame(editGroomer?'Your groomer.':'Add your groomer.',editGroomer?'Keep the person and their business together.':'Save a personal contact. New directory suggestions are reviewed before other owners see them.',
          field('Groomer’s name (optional if business is entered)','name',editGroomer?.name,'text','maxlength="100"')+
          field('Grooming business','business',editGroomer?.business,'text','maxlength="180" autocomplete="organization"')+
          field('Address','address',editGroomer?.address,'text','maxlength="300" autocomplete="street-address"')+
          field('Email','email',editGroomer?.email,'email','maxlength="254" autocomplete="email"')+
          field('Phone','phone',editGroomer?.phone,'tel','maxlength="40" autocomplete="tel"')+
          (!editGroomer?field('City where service is needed','city_text',directoryLocation().cityText||profile.city||'','text','required maxlength="100"')+serviceFields()+field('Mobile service area (optional)','service_area','','text','maxlength="1000" placeholder="Cities or neighborhoods served"'):'')+
          submit(groomerReturn?'Save & use this groomer':'Save groomer'),groomerReturn?'dog':'profile','groomer');return;
      }
      if (screen==='edit-dog' && (dog || dogId==='new')) {
        newDogId=dog?.id || crypto.randomUUID();
        frame(dog?'Edit '+dog.name:'Meet your pup.','These details will fill in a fresh groom.',
          field('Dog’s name','name',dog?.name,'text','required maxlength="60"')+breedField(dog?.breed)+
          field('Birthday (optional)','birthday',dog?.birthday,'date','max="'+dateToday()+'"')+
          field('Weight (optional)','weight',dog?.care_defaults?.weight,'text','maxlength="40" placeholder="e.g. 28 lb"')+
          submit('Next · care & what-ifs'),
          dog?'dog-profile/'+dog.id:'profile','dog');return;
      }
      if (!dog) {navigate('profile',true);return;}
      const dogRoute='dog-profile/'+dog.id;
      if(screen==='dog-care') {
        frame(dog.name+'’s usual care.','Set their usual preferences once. You can adjust them for each groom.',
          link('Edit name, breed, birthday & weight','edit-dog/'+dog.id,'text-action')+
          settings(dog)+healthSettings(dog)+submit('Save care preferences'),dogRoute,'care');return;
      }
      if(screen==='add-photo' || screen==='edit-photo') {
        const editing=screen==='edit-photo';
        const photo=editing?await db.photoFor(id(),dog.id,recordId):{};
        if(ticket!==generation)return;
        if(editing&&!photo){navigate(dogRoute,true);return;}
        photoDraft={id:photo.id||crypto.randomUUID(),image:photo.image_data||'',editing,provider:photo.provider_id?{id:photo.provider_id,business_name:photo.provider_label}:null};
        frame(editing?'Make it theirs.':'A moment for the lookbook.',editing?'Update this photo’s caption, sharing and provider tag.':'Add a photo of '+dog.name+'.',
          '<div id="photo-preview" class="photo-preview">'+(photo.image_data?'<img src="'+esc(photo.image_data)+'" alt="'+esc(photo.caption||dog.name)+'">':'')+'</div>'+(editing?'':'<div class="photo-pickers">'+
          '<label class="secondary upload-choice">Choose a photo<input type="file" accept="image/jpeg,image/png,image/webp" data-lookbook-photo></label>'+
          '<label class="secondary upload-choice">Take a photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-lookbook-photo></label></div>')+
          photoSettings(photo)+field('Caption (optional)','caption',photo.caption||'','text','maxlength="120" placeholder="e.g. Fresh from today’s groom"')+submit(editing?'Save photo details':'Add to lookbook'),dogRoute,'photo');
        const draft=photoDraft;
        disposePhotoProvider=mountPhotoProvider(app.querySelector('.photo-provider'),{initial:draft.provider,onChange:provider=>{draft.provider=provider;}});
        app.querySelector('[type=submit]').disabled=!editing;return;
      }
      if (screen==='dog-profile') {
        const [recent,photos,contacts]=await Promise.all([
          db.historyFor(id(),dog.id,0,3),db.photosFor(id(),dog.id).catch(()=>null),db.groomersFor(id()).catch(()=>[])]);
        if(ticket!==generation)return;
        groomers=contacts;photoOffset=photos?.length||0;
        const choices=Object.entries(validDefaults(dog.care_defaults));
        frame(dog.name+'’s profile',dog.breed||'Your dog’s care and visits',
          `<a class="dog-identity identity-link" href="#/dog-care/${esc(dog.id)}" aria-label="Edit ${esc(dog.name)}’s care and defaults">${icon('pup')}<div><strong>${esc(dog.name)}</strong><small>${dog.birthday?'Birthday · '+esc(dateLabel(dog.birthday)):'Birthday not set'}</small></div><b aria-hidden="true">›</b></a>
          ${choices.length?'<details class="recap"><summary>Usual care preferences</summary><dl>'+choices.map(([k,v])=>'<div class="fact"><dt>'+esc(decisions[k]?.[0]||healthFields.find(f=>f.id===k)?.label||'Nervous level')+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl></details>':''}
          ${groomers.length?'<label class="entry"><span>Groomer for this visit</span><select id="visit-groomer"><option value="">Choose later</option>'+groomers.map(g=>'<option value="'+esc(g.id)+'">'+esc([g.name,g.business].filter(Boolean).join(' · '))+'</option>').join('')+'</select></label>':''}
          ${hasDraft(id(),dog.id)?action('Resume groom','resume','secondary'):''}${action('Plan a new groom','start')}
          <section class="profile-section"><h2>Groom History</h2>${historyCards(recent,dog.id)||'<p class="hint">Your finished grooms will appear here.</p>'}${link('Entire Groom History','history/'+dog.id,'text-action')}</section>
          <section class="dog-lookbook" aria-labelledby="lookbook-heading"><div class="lookbook-heading"><h2 id="lookbook-heading">Lookbook</h2><a class="lookbook-add" href="#/add-photo/${esc(dog.id)}" aria-label="Add a photo to ${esc(dog.name)}’s lookbook">+</a></div>
          ${photos?'<div class="polaroid-strip" tabindex="0" aria-label="Dog photos. Swipe or scroll for more.">'+(photos.map(p=>photoCard(p,dog.id)).join('')||'<a class="polaroid empty-polaroid" href="#/add-photo/'+esc(dog.id)+'"><span>'+icon('picture')+'</span><strong>Add their first photo</strong></a>')+'</div>':'<p role="status">The lookbook couldn’t be loaded. Try again shortly.</p>'}
          ${photos?.length===12?action('More photos','more-photos','text-action'):''}</section>`,'profile');return;
      }
      if (screen==='history') {
        const offset=Math.max(0,parseInt(recordId,10)||0);
        const rows=await db.historyFor(id(),dog.id,offset);
        if(ticket!==generation)return;
        const cards=historyCards(rows.slice(0,historyPageSize),dog.id);
        frame(dog.name+'’s groom history','Open a visit to see the plan or make a copy.', (cards||'<div class="empty"><h2>No grooms here yet.</h2><p>Finish a plan to add the first visit.</p></div>')+
          (offset?link('Newer visits','history/'+dog.id+'/'+Math.max(0,offset-historyPageSize),'text-action'):'')+
          (rows.length>historyPageSize?link('Older visits','history/'+dog.id+'/'+(offset+historyPageSize),'text-action'):'')+
          action('Plan a new groom','start'),dogRoute);return;
      }
      if (screen==='past-groom') {
        const record=await db.openGroom(id(),dog.id,recordId);
        if(ticket!==generation)return;past=record;
        frame(record.service,dateLabel(record.visit_date||record.created_at),
          `<div class="past-actions">${action('Copy & edit this groom','copy')}${action('Print / save PDF','print','text-action')}</div>
          <p class="groom-print-help">Print in portrait, or choose Save as PDF. Turn off browser headers and footers.</p>${groomPlan(record.plan)}`,'history/'+dog.id);return;
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
    if (['PGRST205','42P01','42703','PGRST204'].includes(error?.code)) return 'This feature is awaiting the latest database update.';
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
      const kind=form.dataset.ownerForm;
      if (kind==='signin' || kind==='create-account') {
        if(kind==='create-account' && values.password!==values.confirmation) throw Error('Enter the same password in both fields.');
        if(kind==='create-account')signupRole=values.signup_role==='groomer'?'groomer':'owner';
        const credentials={email:values.email.trim(),password:values.password};
        const {data,error}=kind==='signin' ? await db.client.auth.signInWithPassword(credentials) :
          await db.client.auth.signUp({...credentials,options:signupOptions(signupRole,location.href)});
        if(error)throw error;
        if(valid()) {
          if(data.session) {setIdentity(data.session.user);navigate(home(),true);}
          else frame('Check your email.','Follow the confirmation email to finish creating your account.',
            '<p class="email-receipt">'+esc(credentials.email)+'</p>'+link('Back to log in','account'));
        }
        return;
      }
      if (kind==='forgot-password') {
        const {error}=await db.client.auth.resetPasswordForEmail(values.email.trim(),{redirectTo:location.origin+location.pathname});
        if(error)throw error;
        if(valid())frame('Check your email.','If there’s an account for this address, follow the link to choose a new password.',link('Back to log in','account'));
        return;
      }
      if (kind==='set-password') {
        if(values.password!==values.confirmation)throw Error('Enter the same password in both fields.');
        const {error}=await db.client.auth.updateUser({password:values.password});
        if(error)throw error;
        if(valid()){sessionStorage.removeItem('fd:password-recovery');navigate(profileHome(),true);}
        return;
      }
      if(form.dataset.ownerForm==='owner') {
        if(!values.display_name.trim())throw Error('Enter your name.');
        const contact={display_name:values.display_name.trim(),phone:values.phone.trim()};
        // Empty optional fields remain compatible while the database update is being installed.
        if(values.city.trim() || values.state.trim() || 'city' in (model.profile||{})) {
          contact.city=values.city.trim();contact.state=values.state.trim();
        }
        await db.saveOwner(id(),contact);
        if(valid())navigate(accountRole(user)==='groomer'?'groomer-home':!model.profile?.display_name && !model.dogs.length?'edit-dog/new':'profile',true);return;
      }
      if(kind==='groomer') {
        if(!values.name.trim()&&!values.business.trim())throw Error('Enter your groomer’s name or business name.');
        const contact=Object.fromEntries(['name','business','address','email','phone'].map(k=>[k,values[k].trim()]));
        const groomerId=newDogId,returnTo=groomerReturn;
        if(editGroomer)await db.saveGroomer(id(),groomerId,contact,false);
        else {
          const location=directoryLocation();
          await db.submitDirectoryGroomer(groomerId,contact,values.city_text.trim()===location.cityText?.trim()?location.city?.id||null:null,values.city_text.trim(),
            flagsFromForm(values,'service_',['grooming','daycare','boarding']),flagsFromForm(values,'location_',['fixed_location','mobile']),values.service_area.trim());
        }
        if(valid() && !(returnTo && useGroomer({id:groomerId,...contact},returnTo)))navigate('profile');return;
      }
      if(kind==='photo') {
        if(!photoDraft?.image)throw Error('Choose a photo first.');
        const dogId=dog.id;
        const draft=photoDraft;
        if(!['private','public'].includes(values.visibility))throw Error('Choose who can see this photo.');
        const args=[id(),dogId,draft.id];
        if(!draft.editing)args.push(draft.image);
        args.push(values.caption.trim(),values.visibility,draft.provider?.id||null);
        await (draft.editing?db.updatePhoto:db.savePhoto)(...args);
        if(valid())navigate('dog-profile/'+dogId);return;
      }
      if(kind==='care') {
        const dogId=dog.id,defaults={...dog.care_defaults};
        [...defaultFields,...healthFields.map(f=>f.id)].forEach(key=>delete defaults[key]);
        await db.saveCare(id(),dogId,{...defaults,...validDefaults(values)});
        if(valid())navigate('dog-profile/'+dogId);return;
      }
      if(kind==='dog') {
        const dogId=newDogId;
        if(!values.name.trim())throw Error('Enter a name for your dog.');
        const defaults={...dog?.care_defaults};
        delete defaults.weight;
        if(values.weight.trim())defaults.weight=values.weight.trim();
        await db.saveDog(id(),dogId,{name:values.name.trim(),breed:values.breed.trim(),birthday:values.birthday||null,care_defaults:defaults},!dog);
        if(valid())navigate('dog-care/'+dogId);
      }
    },form.querySelector('[type=submit]'));
  });
  app.addEventListener('change',event=>{
    const input=event.target.closest('[data-lookbook-photo]');
    if(!input?.files?.[0] || !photoDraft)return;
    const file=input.files[0],draft=photoDraft,save=app.querySelector('[type=submit]');
    work(async valid=>{
      if(save)save.disabled=true;
      message('Getting your photo ready…');
      try {
        const image=await readPhoto(file);
        if(!valid() || photoDraft!==draft)return;
        draft.image=image;
        app.querySelector('#photo-preview').innerHTML='<img src="'+esc(image)+'" alt="Photo ready for the lookbook">';
        message('');
      } finally {
        input.value='';
        if(valid() && save)save.disabled=!draft.image;
      }
    },input);
  });
  app.addEventListener('click',event=>{
    const b=event.target.closest('[data-owner-action]');
    if (!b || !active()) return;
    work(async valid=>{
      switch(b.dataset.ownerAction) {
        case 'guest': startVisit(null,null,null,'guest');break;
        case 'signout':
          if(db.client) {const {error}=await db.client.auth.signOut({scope:'local'});if(error)throw error;}
          setIdentity(null);signupRole='owner';sessionStorage.removeItem('fd:signup-role');
          {const url=new URL(location.href);url.searchParams.delete('role');url.searchParams.delete('source');history.replaceState(null,'',url);}
          navigate('account',true);break;
        case 'retry': if(valid())render(current);break;
        case 'print': await printGroomPlan(app);break;
        case 'more-photos': {
          const photos=await db.photosFor(id(),dog.id,photoOffset);
          if(!valid())return;
          photoOffset+=photos.length;
          const strip=app.querySelector('.polaroid-strip');
          const existing=new Set([...strip.querySelectorAll('[data-photo-id]')].map(e=>e.dataset.photoId));
          strip.insertAdjacentHTML('beforeend',photos.filter(p=>!existing.has(p.id)).map(p=>photoCard(p,dog.id)).join(''));
          if(photos.length<12)b.hidden=true;
          message(photos.length?'More photos added to the lookbook.':'You’ve reached the last photo.');break;
        }
        default: {
          if (!dog || !model?.profile)return;
          const selectedGroomer=groomers.find(g=>g.id===app.querySelector('#visit-groomer')?.value);
          startVisit(dog,{...model.profile,email:user.email,selectedGroomer},past,b.dataset.ownerAction);
        }
      }
    },b);
  });
  return {initialize, render, id, home, cancel(){generation++;disposeDirectory?.();disposeDirectory=null;disposePhotoProvider?.();disposePhotoProvider=null;},
    saveVisit(state,plan){if(!user || user.id!==state.ownerId)throw Error('Sign in again to save this groom.');return db.saveGroom(user.id,state.dogId,state.recordId,state.copiedFrom,plan);}};
}
