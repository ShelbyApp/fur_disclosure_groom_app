// Optional: run against npm run dev using Chrome or a CHROME_PATH override.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
const profile=await mkdtemp(path.join(os.tmpdir(),'fur-disclosure-browser-'));
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f){let last;for(let n=0;n<100;n++){try{const x=await f();if(x)return x;}catch(e){last=e;}await pause(100);}throw last||Error('Timed out');}
let sock;
try{
const port=await until(async()=>(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);
const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
sock=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((ok,no)=>{sock.onopen=ok;sock.onerror=no;});
let n=0;const pending=new Map(),errors=[];
sock.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);};
function c(method,params={}){const id=++n;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});sock.send(JSON.stringify({id,method,params}));});}
async function run(expression){const r=await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
const q=JSON.stringify;
const click=selector=>run('document.querySelector('+q(selector)+').click()');
const fill=(name,value)=>run('(()=>{const el=document.getElementsByName('+q(name)+')[0];el.value='+q(value)+';el.dispatchEvent(new Event("input",{bubbles:true}));})()');
const pick=(name,value)=>click('[name="'+name+'"][value="'+value+'"]');
const next=()=>click('button[type=submit]');
const at=async id=>{await until(()=>run('location.hash==='+q('#/'+id)));};
const text=()=>run('document.querySelector("main").innerText');
const size=(width,height)=>c('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
const screenshot=async name=>{await run('Promise.all([...document.images].map(img=>img.decode())).then(()=>true)');await mkdir('test-results',{recursive:true});const image=await c('Page.captureScreenshot',{format:'png'});await writeFile('test-results/'+name+'.png',Buffer.from(image.data,'base64'));};
const checkWidth=async()=>assert.ok(await run('document.documentElement.scrollWidth <= innerWidth'),'horizontal overflow');
// Keep exercising old guest drafts; the public guest-entry button is intentionally hidden.
async function legacyGuest() {
  await run('sessionStorage.removeItem("fur-disclosure:groom:v1");sessionStorage.setItem("fd:guest-active","yes");location.hash="#/welcome"');
  await c('Page.reload');await until(()=>run('!!document.querySelector("[data-mode=advanced]")'));
}
const selectGroomer=async value=>{
  await until(()=>run('!!document.querySelector("[data-saved-groomer]:not(:disabled)")'));
  await run('(()=>{const el=document.querySelector("[data-saved-groomer]");el.value='+q(value)+';el.dispatchEvent(new Event("change",{bubbles:true}));})()');
};

async function upload(key) {
  await run(`(async()=>{const photo=await (await fetch('assets/studio-garden.jpg')).blob();const dt=new DataTransfer();dt.items.add(new File([photo],'dog.jpg',{type:'image/jpeg'}));const input=document.querySelector('[data-photo="${key}"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>run('!!document.querySelector("[data-map='+key+']")'));
}
const moveNext = async id => {await next();await at(id);};
async function saveNote(note,area) {
  await fill('note',note);
  await run('document.querySelector("#pin-form [name=area]").value='+q(area));
  await click('#pin-form button[type=submit]');
}
async function decide(id,value) {
  await click('[data-decision='+id+'] summary');await pick(id,value);
  assert.equal(await run('document.querySelector("[data-decision='+id+']").open'),false);
}
async function limits() {
  await decide('time','Up to 15 extra minutes');await decide('fees','Ask before any added fee');
  await decide('mats','Contact me before changing the cut');await decide('distress','Pause and contact me');
  await decide('unreachable','Complete only work already agreed');
}
async function finish() {
  await moveNext('contact');await fill('email','tester@example.test');
  await moveNext('review-look');await moveNext('review-care');
  assert.equal(await run('document.querySelector("#fields button[type=submit]").disabled'),true);
  await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
  await click('[data-go=groomer-view]');await at('groomer-view');
}
await c('Page.enable');await c('Runtime.enable');await size(1440,940);
const {installAuthFixture}=await import('./auth-fixture.mjs');
await c('Page.addScriptToEvaluateOnNewDocument',{source:'('+installAuthFixture.toString()+')()'});
await c('Page.navigate',{url:'http://127.0.0.1:4381/'});
await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
assert.equal(await run('!!document.querySelector("[data-owner-action=guest]")'),false);
assert.ok(!(await text()).includes('sample profile'));
await run('document.fonts.ready.then(()=>true)');await checkWidth();
assert.ok(await run('document.querySelector("#app").getBoundingClientRect().width<=432'));
await legacyGuest();await screenshot('mode-desktop');
await size(390,844);await screenshot('mode-mobile');
await click('[data-mode=advanced]');await at('dog');await next();await at('dog');
await fill('name','Milo');await fill('breed','Goldendoodle');
assert.equal(await run('!!document.querySelector("[name=salon], [name=groomer], [name=groomerPhone]")'),false);
await moveNext('current-photos');await upload('currentFace');await click('[data-zoom=currentFace]');await click('dialog [data-dismiss]');
await moveNext('service');await pick('service','Bath + haircut');await moveNext('inspiration');await upload('reference');
const rectangle=await run('(()=>{const r=document.querySelector("[data-map=reference]").getBoundingClientRect();return {x:r.left+r.width*.31,y:r.top+r.height*.25};})()');
await c('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rectangle});
await c('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rectangle});
await saveNote('Keep the ears this long','Ear');await click('[data-add-pin=reference]');await click('dialog [data-dismiss]');
assert.equal(await run('document.querySelectorAll(".map-pin").length'),1);
await click('[data-pin=reference]');await saveNote('Keep both ears this long','Ear');
const pin=await run('JSON.parse(sessionStorage.getItem("fur-disclosure:groom:v1")).answers.pins.reference[0]');
assert.ok(Math.abs(pin.x-31)<1 && Math.abs(pin.y-25)<1);
await screenshot('advanced-photo-mobile');
await moveNext('finish');await click('[data-finish="3"]');assert.equal(await run('document.querySelector("input[type=range]").value'),'3');
await moveNext('face');await pick('head','Rounded');await moveNext('body');await screenshot('body-mobile');
await click('[data-go=coat]');await at('coat');await pick('coat','No tangles noticed');await moveNext('handling');
await pick('anxiety','A little nervous');await moveNext('what-ifs');await click('[data-visit=spots]');await at('spots');
await run('(()=>{const el=document.querySelector("[data-guide]");el.value="terrier";el.dispatchEvent(new Event("change",{bubbles:true}));})()');
await click('[data-map=sensitiveMap]');await saveNote('Tender lump on the left side','Side / belly');await screenshot('sensitive-mobile');
await moveNext('what-ifs');await limits();await screenshot('what-ifs-mobile');await finish();
let copy=await text();for(const item of ['Keep both ears this long','Tender lump on the left side','Up to 15 extra minutes','Ask before any added fee','A little nervous']) assert.ok(copy.includes(item),item);
assert.ok(!copy.includes('tester@example.test'));assert.equal(await run('document.querySelectorAll(".groom-sheet .gs-map-pin, .groom-screen-photos .map-pin").length'),2);
let pdf=await c('Page.printToPDF',{preferCSSPageSize:true});assert.ok(pdf.data.length>15000);
await c('Page.reload');await until(()=>run('!!document.querySelector(".groom-sheet")'));
await click('[data-rolehome]');await legacyGuest();assert.equal(await run('!!document.querySelector("[data-resume]")'),false);
await click('[data-mode=basic]');assert.equal(await run('document.querySelector("[name=name]").value'),'');
await fill('name','Pip');await moveNext('service');await pick('service','Bath only');
assert.ok(!(await text()).includes('Match my photo'));
await moveNext('coat');await pick('coat','No tangles noticed');await moveNext('handling');await moveNext('what-ifs');await limits();
await click('[data-visit=spots]');await at('spots');assert.equal(await run('document.querySelectorAll("input[type=file]").length'),0);
assert.equal(await run('document.querySelectorAll("[data-pin=sensitiveMap]").length'),0);
await click('[data-map=sensitiveMap]');await saveNote('Brush gently on her left side','Side / belly');await moveNext('what-ifs');
await finish();copy=await text();assert.ok(copy.includes('Brush gently on her left side'));assert.ok(!copy.includes('Keep both ears this long'));assert.ok(!copy.includes('Rounded'));assert.equal(await run('document.querySelectorAll(".groom-sheet .gs-map-pin").length'),1);
await click('[data-rolehome]');await legacyGuest();await at('welcome');
await click('[data-mode=basic]');await fill('name','Pip');await moveNext('service');await pick('service','Bath only');await moveNext('coat');
await pick('coat','No tangles noticed');await moveNext('handling');await c('Page.reload');await until(()=>run('!!document.querySelector("[name=anxiety]")'));await at('handling');
await size(320,740);await checkWidth();await moveNext('what-ifs');await next();assert.equal(await run('document.querySelector("[data-decision=mats]").open'),true);
// Exercise the real Supabase SDK with a local email/REST fixture.
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=1#/account'});
await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await size(390,844);await screenshot('login-mobile');await checkWidth();
assert.ok(await run('document.querySelector(".login-pup").src.includes("hero-pup-v2")'));
const authLayout=()=>run('Array.from(document.querySelectorAll(".login-pup,[name=email],[name=password]")).map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})');
const loginLayout=await authLayout();
await click('a[href="#/create-account"]');await at('create-account');
assert.deepEqual(await authLayout(),loginLayout);
assert.equal(await run('!!document.querySelector("[data-owner-action=guest]")'),false);
await screenshot('create-account-mobile');await size(320,740);await checkWidth();await size(390,844);
await fill('email','owner@example.test');await fill('password','fixture password one');await fill('confirmation','fixture password one');await next();
await until(()=>run('document.querySelector("h1").textContent.includes("Check your email")'));
const ownerId='11111111-1111-4111-8111-111111111111';
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const fixtureToken=encode({alg:'HS256',typ:'JWT'})+'.'+encode({exp:expires,sub:ownerId,role:'authenticated'})+'.ZmFrZQ';
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=2#access_token='+fixtureToken+'&refresh_token=local-fixture&expires_in=3600&expires_at='+expires+'&token_type=bearer&type=signup'});
await until(()=>run('!!document.querySelector("[data-owner-form=owner]")'));
assert.equal(await run('document.querySelector("[name=account_email]").value'),'owner@example.test');
assert.equal(await run('!!document.querySelector('+q('[data-owner-action=signout], a[href="#/set-password"]')+')'),false);
await fill('display_name','Fixture owner');await fill('phone','555-0101');await fill('city','Austin');await fill('state','TX');
await screenshot('owner-onboarding-mobile');await click('[data-owner-form=owner] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Lola');await fill('breed','Terrier');await fill('birthday','2021-03-14');await fill('weight','18 lb');
assert.equal(await run('document.querySelectorAll("[data-owner-form=dog] select").length'),0);
await screenshot('dog-basics-mobile');await click('[data-owner-form=dog] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));
await fill('time','Up to 30 extra minutes');await fill('allergies','Fragranced shampoo');await fill('meds','Daily prescribed medication');
await fill('mobility','Needs a sitting break');await fill('comfortNotes','Gentle handling around ears');
await screenshot('dog-care-mobile');await run('document.querySelector("[name=allergies]").closest("label").scrollIntoView()');await screenshot('dog-health-mobile');await next();
await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
const firstPet=await run('location.hash');
// Saved groomers stay separate from dogs, and can prefill a new visit.
await click('a[href="#/profile"]');await until(()=>run('!!document.querySelector('+q('a[href="#/find-groomer/new"]')+')'));
await click('a[href="#/owner-settings"]');await until(()=>run('!!document.querySelector("[data-owner-form=owner]")'));
assert.equal(await run('document.querySelector("[name=city]").value'),'Austin');
assert.equal(await run('document.querySelector("[name=state]").value'),'TX');
await fill('city','San Marcos');await next();await until(()=>run('!!document.querySelector('+q('a[href="#/find-groomer/new"]')+')'));
for(const [name,business] of [['Jamie','Maple & Mutt'],['Taylor','Happy Paws']]) {
  await click('a[href="#/find-groomer/new"]');await until(()=>run('!!document.querySelector("[data-directory-create]")'));await click('[data-directory-create]');await until(()=>run('!!document.querySelector("[data-owner-form=groomer]")'));
  await fill('name',name);await fill('business',business);await fill('address','12 Main Street');await fill('email','groomer@example.test');await fill('phone','555-0190');
  await next();await until(()=>run('!!document.querySelector('+q('a[href="#/find-groomer/new"]')+')'));
}
assert.equal(await run('document.querySelectorAll(".groomer-card").length'),2);
await click('.groomer-card');await until(()=>run('!!document.querySelector("[data-owner-form=groomer]")'));
await fill('phone','555-0191');await next();await until(()=>run('document.querySelectorAll(".groomer-card").length===2'));
await click('a[href='+q(firstPet)+']');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('.identity-link');await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));
assert.equal(await run('document.querySelector("[name=time]").value'),'Up to 30 extra minutes');
assert.equal(await run('document.querySelector("[name=allergies]").value'),'Fragranced shampoo');
await click('a[href*="/edit-dog/"]');await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('weight','19 lb');await next();await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));
assert.equal(await run('document.querySelector("[name=time]").value'),'Up to 30 extra minutes');
await next();await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await run('document.querySelector("#visit-groomer").selectedIndex=1');
await click('[data-owner-action=start]');await click('[data-mode=basic]');await at('dog');
for(const [key,value] of Object.entries({name:'Lola',breed:'Terrier',weight:'19 lb',birthday:'2021-03-14'})) {
  assert.equal(await run('document.getElementsByName('+q(key)+')[0].value'),value);
}
await until(()=>run('!!document.querySelector("[data-saved-groomer]:not(:disabled)")'));
assert.equal(await run('!!document.querySelector("[name=salon], [name=groomer], [name=groomerAddress], [name=groomerEmail], [name=groomerPhone]")'),false);
assert.match(await text(),/Jamie/);assert.match(await text(),/555-0191/);
const savedGroomer=await run('document.querySelector("[data-saved-groomer]").value');
await fill('visit','2026-12-01');
await selectGroomer('');assert.equal(await run('!!document.querySelector(".groomer-summary")'),false);
await selectGroomer(savedGroomer);
await click('[data-create-groomer]');await until(()=>run('!!document.querySelector("[data-directory-create]")'));
await click('a[href="#/dog"]');await until(()=>run('!!document.querySelector("[data-saved-groomer]:not(:disabled)")'));
assert.equal(await run('document.querySelector("[name=visit]").value'),'2026-12-01');
await click('[data-create-groomer]');await until(()=>run('!!document.querySelector("[data-directory-create]")'));await click('[data-directory-create]');await until(()=>run('!!document.querySelector("[data-owner-form=groomer]")'));
await c('Page.reload');await until(()=>run('!!document.querySelector("[data-owner-form=groomer]")'));
await fill('name','Casey');await fill('business','The Groom Room');await fill('phone','555-0188');await next();
await until(()=>run('!!document.querySelector("[data-saved-groomer]:not(:disabled)")'));
assert.match(await text(),/Casey/);assert.match(await text(),/The Groom Room/);
assert.equal(await run('document.querySelector("[name=visit]").value'),'2026-12-01');
assert.equal(await run('JSON.parse(sessionStorage.getItem("test:rows:fd_groomers")).length'),3);
await screenshot('groomer-selection-mobile');
await moveNext('service');await pick('service','Bath only');await moveNext('coat');await pick('coat','No tangles noticed');
await moveNext('handling');await click('[data-visit=health]');await at('health');
assert.equal(await run('document.querySelector("[name=allergies]").value'),'Fragranced shampoo');
assert.equal(await run('document.querySelector("[name=mobility]").value'),'Needs a sitting break');
await fill('allergies','Use the shampoo I brought today');await next();await at('handling');
await moveNext('what-ifs');assert.match(await text(),/Up to 30 extra minutes/);
await limits();await moveNext('contact');
for(const value of ['Fixture owner','555-0101','owner@example.test'])assert.ok((await text()).includes(value));
assert.equal(await run('!!document.querySelector("[name=owner],[name=phone],[name=email]")'),false);
assert.ok(!(await text()).includes('Edit contact for this visit'));
await click('details.extra summary');await fill('secondaryOwner','Sam');await fill('secondaryPhone','555-0123');await click('[name=includeContact]');
await screenshot('secondary-contact-mobile');
await moveNext('review-look');await moveNext('review-care');await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
await click('[data-go^=history]');await until(()=>run('!!document.querySelector("a[href*=past-groom]")'));await click('a[href*=past-groom]');
await until(()=>run('!!document.querySelector("[data-owner-action=copy]")'));assert.match(await text(),/555-0123/);assert.match(await text(),/Sam/);
assert.match(await text(),/Casey/);assert.match(await text(),/Use the shampoo I brought today/);
assert.equal(await run('JSON.parse(sessionStorage.getItem("test:rows:fd_dogs"))[0].care_defaults.allergies'),'Fragranced shampoo');
await click('[data-owner-action=copy]');await at('review-look');await moveNext('review-care');await click('[data-edit=contact]');
assert.match(await text(),/555-0101/);
assert.equal(await run('document.querySelector("[name=secondaryPhone]").value'),'555-0123');
assert.equal(await run('document.querySelector("[name=includeContact]").checked'),false);
await moveNext('review-care');await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
await click('[data-go^=history]');await until(()=>run('document.querySelectorAll("a[href*=past-groom]").length===2'));
for(let i=0;i<2;i++) {
  await click('a[href*=past-groom]');await until(()=>run('!!document.querySelector("[data-owner-action=copy]")'));
  await click('[data-owner-action=copy]');await at('review-look');await moveNext('review-care');
  await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
  await click('[data-go^=history]');await until(()=>run('document.querySelectorAll("a[href*=past-groom]").length==='+q(i+3)));
}
await click('a[href='+q(firstPet)+']');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
assert.equal(await run('document.querySelectorAll(".history-card").length'),3);
assert.match(await text(),/Entire Groom History/);
for(const [asset,caption] of [['studio-garden.jpg','A fresh trim'],['hero-pup-v2-720.jpg','Ready for the next groom']]) {
  await click('.lookbook-add');await until(()=>run('!!document.querySelector("[data-owner-form=photo]")'));
  assert.equal(await run('document.querySelector("[type=submit]").disabled'),true);
  await run(`(async()=>{const image=await(await fetch('assets/'+${q(asset)})).blob();const dt=new DataTransfer();dt.items.add(new File([image],'dog.jpg',{type:'image/jpeg'}));const input=document.querySelector('[data-lookbook-photo]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(()=>run('!!document.querySelector("#photo-preview img")'));
  await fill('caption',caption);await next();await until(()=>run('!!document.querySelector(".polaroid img")'));
}
assert.equal(await run('document.querySelectorAll(".polaroid img").length'),2);
await c('Page.reload');await until(()=>run('document.querySelectorAll(".polaroid img").length===2'));
await checkWidth();await screenshot('dog-profile-mobile');
await run('document.querySelector(".dog-lookbook").scrollIntoView()');await screenshot('dog-lookbook-mobile');
assert.ok(await run('(()=>{const el=document.querySelector(".polaroid-strip");return el.scrollWidth>el.clientWidth})()'));
await run('document.querySelector(".polaroid-strip").scrollTo({left:500,behavior:"instant"})');
assert.ok(await run('document.querySelector(".polaroid-strip").scrollLeft>0'));
await size(1440,940);await checkWidth();await screenshot('dog-lookbook-desktop');await size(320,740);await checkWidth();
await click('.identity-link');await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));
await fill('time','');await next();await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('.identity-link');await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));
assert.equal(await run('document.querySelector("[name=time]").value'),'');await next();
await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('a[href="#/profile"]');await until(()=>run('!!document.querySelector("a[href*=edit-dog]")'));
await click('a[href="#/edit-dog/new"]');await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Nova');await click('[data-owner-form=dog] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-form=care]")'));await next();await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
assert.equal(await run('document.querySelectorAll(".polaroid img").length'),0);
await click('a[href*="/history/"]');await until(()=>run('document.querySelector("main").textContent.includes("No grooms here yet")'));
await click('a[href="#/profile"]');await until(()=>run('document.querySelectorAll(".pet-card:not(.groomer-card)").length===2'));
await c('Page.reload');await until(()=>run('document.querySelectorAll(".pet-card:not(.groomer-card)").length===2'));await checkWidth();
await screenshot('owner-household-mobile');
await click('a[href='+q(firstPet)+']');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('[data-owner-action=start]');await click('[data-mode=advanced]');await moveNext('current-photos');
await click('[data-later]');await until(()=>run('!!document.querySelector("[data-owner-action=resume]")'));
await click('[data-owner-action=resume]');await at('current-photos');
await click('[data-rolehome]');await until(()=>run('!!document.querySelector("[data-owner-action=signout]")'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await fill('email','owner@example.test');await fill('password','fixture password one');await next();
await until(()=>run('document.querySelectorAll(".pet-card:not(.groomer-card)").length===2'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await click('a[href="#/forgot-password"]');
await fill('email','owner@example.test');await next();
await until(()=>run('document.querySelector("h1").textContent.includes("Check your email")'));
const emailRequest=await run('JSON.parse(sessionStorage.getItem("test:mail"))');assert.equal(emailRequest.email,'owner@example.test');assert.equal(emailRequest.redirect,'http://127.0.0.1:4381/');
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=2#access_token='+fixtureToken+'&refresh_token=local-fixture&expires_in=3600&expires_at='+expires+'&token_type=bearer&type=recovery'});
await until(()=>run('!!document.querySelector("[data-owner-form=set-password]")'));
await c('Page.reload');await until(()=>run('!!document.querySelector("[data-owner-form=set-password]")'));
await fill('password','fixture password two');await fill('confirmation','fixture password two');await next();
await until(()=>run('document.querySelectorAll(".pet-card:not(.groomer-card)").length===2'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await fill('email','owner@example.test');await fill('password','wrong password');await next();
await until(()=>run('!!document.querySelector("#account-message").textContent'));
await fill('password','fixture password two');await next();await until(()=>run('document.querySelectorAll(".pet-card:not(.groomer-card)").length===2'));
assert.deepEqual(errors,[]);console.log('Passed: matching login/signup layouts, password flows, groomer selection and creation with draft return, editable health prefill, secondary contacts, multiple dogs, history and lookbook.');

}finally{sock?.close();const closed=browser.exitCode===null?once(browser,'exit').catch(()=>{}):Promise.resolve();browser.kill();await Promise.race([closed,pause(2000)]);if(path.dirname(path.resolve(profile))===path.resolve(os.tmpdir()) && path.basename(profile).startsWith('fur-disclosure-browser-'))await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});}

