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
const screenshot=async name=>{await mkdir('test-results',{recursive:true});const image=await c('Page.captureScreenshot',{format:'png'});await writeFile('test-results/'+name+'.png',Buffer.from(image.data,'base64'));};
const checkWidth=async()=>assert.ok(await run('document.documentElement.scrollWidth <= innerWidth'),'horizontal overflow');

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
await until(()=>run('!!document.querySelector("[data-owner-action=guest]")'));
assert.ok(!(await text()).includes('sample profile'));
await run('document.fonts.ready.then(()=>true)');await checkWidth();
assert.ok(await run('document.querySelector("#app").getBoundingClientRect().width<=432'));
await click('[data-owner-action=guest]');await screenshot('mode-desktop');
await size(390,844);await screenshot('mode-mobile');
await click('[data-mode=advanced]');await at('dog');await next();await at('dog');
await fill('name','Milo');await fill('breed','Goldendoodle');await fill('salon','Maple & Mutt');await fill('groomer','Jamie');
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
let copy=await text();for(const item of ['Jamie','Maple & Mutt','Keep both ears this long','Tender lump on the left side','Up to 15 extra minutes','Ask before any added fee','A little nervous']) assert.ok(copy.includes(item),item);
assert.ok(!copy.includes('tester@example.test'));assert.equal(await run('document.querySelectorAll(".sheet .map-pin").length'),2);
let pdf=await c('Page.printToPDF',{preferCSSPageSize:true});assert.ok(pdf.data.length>15000);
await c('Page.reload');await until(()=>run('!!document.querySelector(".sheet")'));
await click('[data-rolehome]');await click('[data-owner-action=guest]');assert.equal(await run('!!document.querySelector("[data-resume]")'),false);
await click('[data-mode=basic]');assert.equal(await run('document.querySelector("[name=name]").value'),'');
await fill('name','Pip');await moveNext('service');await pick('service','Bath only');
assert.ok(!(await text()).includes('Match my photo'));
await moveNext('coat');await pick('coat','No tangles noticed');await moveNext('handling');await moveNext('what-ifs');await limits();
await click('[data-visit=spots]');await at('spots');assert.equal(await run('document.querySelectorAll("input[type=file]").length'),0);
assert.equal(await run('document.querySelectorAll("[data-pin=sensitiveMap]").length'),0);
await click('[data-map=sensitiveMap]');await saveNote('Brush gently on her left side','Side / belly');await moveNext('what-ifs');
await finish();copy=await text();assert.ok(copy.includes('Brush gently on her left side'));assert.ok(!copy.includes('Keep both ears this long'));assert.ok(!copy.includes('Rounded'));assert.equal(await run('document.querySelectorAll(".sheet .map-pin").length'),1);
await click('[data-rolehome]');await click('[data-owner-action=guest]');await at('welcome');
await click('[data-mode=basic]');await fill('name','Pip');await moveNext('service');await pick('service','Bath only');await moveNext('coat');
await pick('coat','No tangles noticed');await moveNext('handling');await c('Page.reload');await until(()=>run('!!document.querySelector("[name=anxiety]")'));await at('handling');
await size(320,740);await checkWidth();await moveNext('what-ifs');await next();assert.equal(await run('document.querySelector("[data-decision=mats]").open'),true);
// Exercise the real Supabase SDK with a local email/REST fixture.
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=1#/account'});
await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await click('a[href="#/create-account"]');await at('create-account');
await fill('email','owner@example.test');await fill('password','fixture password one');await fill('confirmation','fixture password one');await next();
await until(()=>run('document.querySelector("h1").textContent.includes("Check your email")'));
const ownerId='11111111-1111-4111-8111-111111111111';
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const fixtureToken=encode({alg:'HS256',typ:'JWT'})+'.'+encode({exp:expires,sub:ownerId,role:'authenticated'})+'.ZmFrZQ';
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=2#access_token='+fixtureToken+'&refresh_token=local-fixture&expires_in=3600&expires_at='+expires+'&token_type=bearer&type=signup'});
await until(()=>run('!!document.querySelector("[data-owner-form=owner]")'));
assert.equal(await run('document.querySelector("[name=account_email]").value'),'owner@example.test');
await fill('display_name','Fixture owner');await fill('phone','555-0101');await click('[data-owner-form=owner] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Lola');await fill('breed','Terrier');await fill('birthday','2021-03-14');await fill('weight','18 lb');
await fill('time','Up to 30 extra minutes');await click('[data-owner-form=dog] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
const firstPet=await run('location.hash');
await click('[data-owner-action=start]');await click('[data-mode=basic]');await at('dog');
for(const [key,value] of Object.entries({name:'Lola',breed:'Terrier',weight:'18 lb',birthday:'2021-03-14'})) {
  assert.equal(await run('document.getElementsByName('+q(key)+')[0].value'),value);
}
await moveNext('service');await pick('service','Bath only');await moveNext('coat');await pick('coat','No tangles noticed');
await moveNext('handling');await moveNext('what-ifs');assert.match(await text(),/Up to 30 extra minutes/);
await limits();await moveNext('contact');
for(const [key,value] of Object.entries({owner:'Fixture owner',phone:'555-0101',email:'owner@example.test'})) {
  assert.equal(await run('document.getElementsByName('+q(key)+')[0].value'),value);
}
await click('details.extra summary');await fill('phone','555-0123');await click('[name=includeContact]');
await moveNext('review-look');await moveNext('review-care');await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
await click('[data-go^=history]');await until(()=>run('!!document.querySelector("a[href*=past-groom]")'));await click('a[href*=past-groom]');
await until(()=>run('!!document.querySelector("[data-owner-action=copy]")'));assert.match(await text(),/555-0123/);
await click('[data-owner-action=copy]');await at('review-look');await moveNext('review-care');await click('[data-edit=contact]');
assert.equal(await run('document.querySelector("[name=phone]").value'),'555-0101');
assert.equal(await run('document.querySelector("[name=includeContact]").checked'),false);
await moveNext('review-care');await click('[name=checked]');await click('[name=understood]');await moveNext('ready');
await click('[data-go^=history]');await until(()=>run('document.querySelectorAll("a[href*=past-groom]").length===2'));
await click('a[href="#/profile"]');await until(()=>run('!!document.querySelector("a[href*=edit-dog]")'));
await click('a[href="#/edit-dog/new"]');await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Nova');await click('[data-owner-form=dog] [type=submit]');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('a[href*="/history/"]');await until(()=>run('document.querySelector("main").textContent.includes("No grooms here yet")'));
await click('a[href="#/profile"]');await until(()=>run('document.querySelectorAll(".pet-card").length===2'));
await c('Page.reload');await until(()=>run('document.querySelectorAll(".pet-card").length===2'));await checkWidth();
await screenshot('owner-household-mobile');
await click('a[href='+q(firstPet)+']');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('[data-owner-action=start]');await click('[data-mode=advanced]');await moveNext('current-photos');
await click('[data-later]');await until(()=>run('!!document.querySelector("[data-owner-action=resume]")'));
await click('[data-owner-action=resume]');await at('current-photos');
await click('[data-rolehome]');await until(()=>run('!!document.querySelector("[data-owner-action=signout]")'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await fill('email','owner@example.test');await fill('password','fixture password one');await next();
await until(()=>run('document.querySelectorAll(".pet-card").length===2'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await click('a[href="#/forgot-password"]');
await fill('email','owner@example.test');await next();
await until(()=>run('document.querySelector("h1").textContent.includes("Check your email")'));
const emailRequest=await run('JSON.parse(sessionStorage.getItem("test:mail"))');assert.equal(emailRequest.email,'owner@example.test');assert.equal(emailRequest.redirect,'http://127.0.0.1:4381/');
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=2#access_token='+fixtureToken+'&refresh_token=local-fixture&expires_in=3600&expires_at='+expires+'&token_type=bearer&type=recovery'});
await until(()=>run('!!document.querySelector("[data-owner-form=set-password]")'));
await c('Page.reload');await until(()=>run('!!document.querySelector("[data-owner-form=set-password]")'));
await fill('password','fixture password two');await fill('confirmation','fixture password two');await next();
await until(()=>run('document.querySelectorAll(".pet-card").length===2'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await fill('email','owner@example.test');await fill('password','wrong password');await next();
await until(()=>run('!!document.querySelector("#account-message").textContent'));
await fill('password','fixture password two');await next();await until(()=>run('document.querySelectorAll(".pet-card").length===2'));
assert.deepEqual(errors,[]);console.log('Passed: signup confirmation, password login and recovery, saved profiles, multiple dogs, and fresh guest visits.');

}finally{sock?.close();const closed=browser.exitCode===null?once(browser,'exit').catch(()=>{}):Promise.resolve();browser.kill();await Promise.race([closed,pause(2000)]);await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});}

