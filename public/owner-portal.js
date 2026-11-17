import {byId, decisionIds} from './flow.js';
import {escapeHtml as esc} from './maps.js';
import {decisions, icon, summary} from './views.js';
import {defaultFields, historyPageSize, validDefaults} from './profile-model.js';
import * as db from './account-store.js';

const routes = new Set(['account','create-account','forgot-password','set-password','profile','owner-settings','dog-profile','edit-dog','history','past-groom']);
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
const petCard = dog => `<a class="pet-card" href="#/dog-profile/${esc(dog.id)}">${icon('pup')}<span><strong>${esc(dog.name)}</strong><small>${esc(dog.breed||'Dog profile')}</small></span><b>›</b></a>`;

export function ownerPortal({app, navigate, identityChanged, startVisit, hasDraft}) {
  let user=null, generation=0, current='', model=null, dog=null, past=null, newDogId=null, signedInError='';
  let sessionReady=false;
  const id = () => user?.id || null;
  const recovering = () => Boolean(user && sessionStorage.getItem('fd:password-recovery')===user.id);
  const home = () => recovering()?'set-password':user?'profile':'account';

  function setIdentity(next) {
    if ((user?.id||null)===(next?.id||null)) return false;
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
    if (screen==='set-password') {
      frame('Choose a new password.','Use this password the next time you log in.',
        password('New password','password','new-password')+password('Confirm password','confirmation','new-password')+
        submit('Save password')+action('Sign out','signout','text-action'),'','set-password');
      return;
    }
    if (db.configured && screen==='create-account') {
      frame('Create your account.','Keep your dogs and their groom history in one place.',
        email+password('Password','password','new-password')+password('Confirm password','confirmation','new-password')+submit('Create account'),'account','create-account');
      return;
    }
    if (db.configured && screen==='forgot-password') {
      frame('Set or reset your password.','Enter your account email. We’ll send you a password reset link.',
        email+submit('Send reset link'),'account','forgot-password');return;
    }
    const loginForm = db.configured
      ? `<form class="portal-form" data-owner-form="signin">${email}${password('Password','password','current-password')}${submit('Log in')}</form>`+
        link('Forgot password?','forgot-password','text-action')+link('Create an account','create-account','secondary')
      : '<p class="hint" role="status">Account sign-in is unavailable right now. You can still plan a guest visit.</p>';
    frame('Your pups, all here.','Log in to plan a groom or find a past visit.',
      '<img class="garden" src="assets/studio-garden.jpg" alt="A groomed apricot dog in a garden">'+loginForm+
      action('Continue as a guest','guest','text-action'));
    if (signedInError) message(signedInError);
  }
  async function render(route) {
    current=route;const ticket=++generation;
    const [screen,dogId,recordId]=route.split('/');
    if (!user) {if(!entryRoutes.includes(screen)) {navigate('account',true);return;}login(screen);return;}
    if (screen==='set-password') {login(screen);return;}
    if (recovering() || entryRoutes.includes(screen)) {navigate(home(),true);return;}
    frame('Your profile','Loading your pups…','');
    try {
      const household=await db.household(id());
      if (ticket!==generation) return;
      model=household;dog=model.dogs.find(d=>d.id===dogId);past=null;
      const profile=model.profile;
      if (screen==='owner-settings' || !profile?.display_name) {
        frame(profile?.display_name?'Your contact details':'First, meet the owner.',profile?.display_name?'These details fill in your next groom.':'Save your contact details, then add your first dog.',
          field('Your name','display_name',profile?.display_name||'','text','required maxlength="100" autocomplete="name"')+
          field('Sign-in email','account_email',user.email,'email','readonly autocomplete="email"')+
          field('Phone (optional)','phone',profile?.phone||'','tel','maxlength="40" autocomplete="tel"')+
          submit(profile?.display_name?'Save changes':'Save & add my first dog')+link('Set or change password','set-password','text-action')+action('Sign out','signout','text-action'),profile?.display_name?'profile':'','owner');return;
      }
      if (screen==='profile') {
        frame('Your pups.','Choose a dog to plan a visit or see their groom history.',
          `<div class="owner-strip">${icon('groomer')}<strong>${esc(profile.display_name)}</strong>${link('Edit profile','owner-settings','text-action')}</div>`+
          (model.dogs.length?model.dogs.map(petCard).join(''):'<div class="empty">'+icon('pup')+'<h2>Add your first dog.</h2><p>Save their birthday and usual care preferences once.</p></div>')+
          link('＋ Add a dog','edit-dog/new','primary')+action('Sign out','signout','text-action'));return;
      }
      if (screen==='edit-dog' && (dog || dogId==='new')) {
        newDogId=dog?.id || crypto.randomUUID();
        frame(dog?'Edit '+dog.name:'Meet your pup.','These details will fill in a fresh groom.',
          field('Dog’s name','name',dog?.name,'text','required maxlength="60"')+field('Breed or mix','breed',dog?.breed,'text','maxlength="180"')+
          field('Birthday (optional)','birthday',dog?.birthday,'date','max="'+dateToday()+'"')+
          field('Weight (optional)','weight',dog?.care_defaults?.weight,'text','maxlength="40" placeholder="e.g. 28 lb"')+
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
      const kind=form.dataset.ownerForm;
      if (kind==='signin' || kind==='create-account') {
        if(kind==='create-account' && values.password!==values.confirmation) throw Error('Enter the same password in both fields.');
        const credentials={email:values.email.trim(),password:values.password};
        const {data,error}=kind==='signin' ? await db.client.auth.signInWithPassword(credentials) :
          await db.client.auth.signUp({...credentials,options:{emailRedirectTo:location.origin+location.pathname}});
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
        if(valid()){sessionStorage.removeItem('fd:password-recovery');navigate('profile',true);}
        return;
      }
      if(form.dataset.ownerForm==='owner') {
        if(!values.display_name.trim())throw Error('Enter your name.');
        await db.saveOwner(id(),{display_name:values.display_name.trim(),phone:values.phone.trim()});
        if(valid())navigate(!model.profile?.display_name && !model.dogs.length?'edit-dog/new':'profile',true);return;
      }
      const dogId=newDogId;
      if(!values.name.trim())throw Error('Enter a name for your dog.');
      const defaults={...validDefaults(values)};
      if(values.weight.trim()) defaults.weight=values.weight.trim();
      await db.saveDog(id(),dogId,{name:values.name.trim(),breed:values.breed.trim(),birthday:values.birthday||null,care_defaults:defaults},!dog);
      if(valid())navigate('dog-profile/'+dogId);
    },form.querySelector('[type=submit]'));
  });
  app.addEventListener('click',event=>{
    const b=event.target.closest('[data-owner-action]');
    if (!b || !active()) return;
    work(async valid=>{
      switch(b.dataset.ownerAction) {
        case 'guest': startVisit(null,null,null,'guest');break;
        case 'signout':
          if(db.client) {const {error}=await db.client.auth.signOut({scope:'local'});if(error)throw error;}
          setIdentity(null);navigate('account',true);break;
        case 'retry': if(valid())render(current);break;
        case 'print': window.print();break;
        default: {
          if (!dog || !model?.profile)return;
          startVisit(dog,{...model.profile,email:user.email},past,b.dataset.ownerAction);
        }
      }
    },b);
  });
  return {initialize, render, id, home, cancel(){generation++;},
    saveVisit(state,plan){if(!user || user.id!==state.ownerId)throw Error('Sign in again to save this groom.');return db.saveGroom(user.id,state.dogId,state.recordId,state.copiedFrom,plan);}};
}
