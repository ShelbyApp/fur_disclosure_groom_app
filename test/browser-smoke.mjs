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
await c('Page.navigate',{url:'http://127.0.0.1:4381/'});await until(()=>run('!!document.querySelector("[data-owner-action=demo]")'));
await click('[data-owner-action=demo]');await until(()=>run('!!document.querySelector(".pet-card")'));
await click('a[href="#/edit-dog/new"]');await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Nova');await fill('breed','Terrier');await fill('birthday','2021-03-14');
await fill('time','Up to 30 extra minutes');await click('[data-owner-form=dog] [type=submit]');
await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
await click('[data-owner-action=start]');await click('[data-mode=basic]');await at('dog');
assert.equal(await run('document.querySelector("[name=name]").value'),'Nova');
assert.equal(await run('document.querySelector("[name=birthday]").value'),'2021-03-14');
await moveNext('service');await pick('service','Bath only');await moveNext('coat');await pick('coat','No tangles noticed');
await moveNext('handling');await moveNext('what-ifs');assert.match(await text(),/Up to 30 extra minutes/);
await click('[data-later]');await until(()=>run('!!document.querySelector("[data-owner-action=resume]")'));
await click('a[href="#/profile"]');await until(()=>run('document.querySelectorAll(".pet-card").length===2'));
await screenshot('owner-household-mobile');await click('a[href="#/dog-profile/sample-milo"]');
await until(()=>run('!!document.querySelector("a[href*=history]")'));await click('a[href="#/history/sample-milo"]');
await until(()=>run('!!document.querySelector("a[href*=past-groom]")'));await click('a[href*=past-groom]');
await until(()=>run('!!document.querySelector("[data-owner-action=copy]")'));await click('[data-owner-action=copy]');await at('review-look');
await click('[data-edit=face]');await pick('head','Natural');await moveNext('review-look');await moveNext('review-care');
await click('[data-edit=spots]');await click('[data-pin=sensitiveMap]');await click('[data-delete-pin]');await moveNext('review-care');
await click('[name=checked]');await click('[name=understood]');await moveNext('ready');await click('[data-go^=history]');
await until(()=>run('document.querySelectorAll("a[href*=past-groom]").length===2'));
await click('a[href*=past-groom]');await until(()=>run('!!document.querySelector(".sheet")'));
assert.match(await text(),/Natural/);assert.ok(!(await text()).includes('Brush gently on the left side.'));
await click('a[href="#/history/sample-milo"]');await until(()=>run('document.querySelectorAll("a[href*=past-groom]").length===2'));
await click('a[href="#/past-groom/sample-milo/sample-visit"]');await until(()=>run('!!document.querySelector(".sheet")'));assert.match(await text(),/Rounded/);assert.match(await text(),/Brush gently on the left side/);
await click('a[href="#/profile"]');await until(()=>run('!!document.querySelector("[data-owner-action=signout]")'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-action=guest]")'));
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
await click('[data-rolehome]');await click('.role.owner');await click('[data-owner-action=guest]');await click('[data-mode=basic]');await moveNext('service');
assert.ok(!(await text()).includes('Match my photo'));
await moveNext('coat');await moveNext('handling');await moveNext('what-ifs');
await click('[data-visit=spots]');await at('spots');assert.equal(await run('document.querySelectorAll("input[type=file]").length'),0);
await click('[data-pin=sensitiveMap]');await saveNote('Brush gently on her left side','Side / belly');await moveNext('what-ifs');
await finish();copy=await text();assert.ok(copy.includes('Brush gently on her left side'));assert.ok(!copy.includes('Keep both ears this long'));assert.ok(!copy.includes('Rounded'));assert.equal(await run('document.querySelectorAll(".sheet .map-pin").length'),1);
await click('[data-rolehome]');await click('.role.owner');await click('[data-owner-action=guest]');await click('[data-new]');await click('dialog [data-confirm]');await at('welcome');
await click('[data-mode=basic]');await fill('name','Pip');await moveNext('service');await pick('service','Bath only');await moveNext('coat');
await pick('coat','No tangles noticed');await moveNext('handling');await click('[data-later]');await click('.role.owner');await click('[data-owner-action=guest]');await click('[data-resume]');await at('handling');
await size(320,740);await checkWidth();await moveNext('what-ifs');await next();assert.equal(await run('document.querySelector("[data-decision=mats]").open'),true);
// Exercise the real Supabase SDK with a local email/REST fixture.
const {installAuthFixture}=await import('./auth-fixture.mjs');
await c('Page.addScriptToEvaluateOnNewDocument',{source:'('+installAuthFixture.toString()+')()'});
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=1#/account'});
await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
await fill('email','owner@example.test');await click('[data-owner-form=signin] [type=submit]');
await until(()=>run('document.querySelector("#account-message").textContent.includes("Check your email")'));
const emailRequest=await run('JSON.parse(sessionStorage.getItem("test:mail"))');assert.equal(emailRequest.email,'owner@example.test');assert.equal(emailRequest.redirect,'http://127.0.0.1:4381/');
const ownerId='11111111-1111-4111-8111-111111111111';
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const fixtureToken=encode({alg:'HS256',typ:'JWT'})+'.'+encode({exp:expires,sub:ownerId,role:'authenticated'})+'.ZmFrZQ';
await c('Page.navigate',{url:'http://127.0.0.1:4381/?fixture=2#access_token='+fixtureToken+'&refresh_token=local-fixture&expires_in=3600&expires_at='+expires+'&token_type=bearer&type=magiclink'});
await until(()=>run('!!document.querySelector("[data-owner-form=owner]")'));
await fill('display_name','Fixture owner');await click('[data-owner-form=owner] [type=submit]');
await until(()=>run('!!document.querySelector("a[href*=edit-dog]")'));
await click('a[href*=edit-dog]');await until(()=>run('!!document.querySelector("[data-owner-form=dog]")'));
await fill('name','Lola');await click('[data-owner-form=dog] [type=submit]');await until(()=>run('!!document.querySelector("[data-owner-action=start]")'));
assert.match(await text(),/Lola/);await click('[data-owner-action=start]');await click('[data-mode=basic]');
await moveNext('service');await pick('service','Bath only');await moveNext('coat');await pick('coat','No tangles noticed');
await moveNext('handling');await moveNext('what-ifs');await limits();await finish();assert.match(await text(),/Lola/);
assert.equal(await run('JSON.parse(sessionStorage.getItem("test:rows:fd_grooms")).length'),1);
await click('[data-rolehome]');await until(()=>run('!!document.querySelector("[data-owner-action=signout]")'));
await click('[data-owner-action=signout]');await until(()=>run('!!document.querySelector("[data-owner-form=signin]")'));
assert.deepEqual(errors,[]);console.log('Passed: authenticated SDK callback, profile/dog/groom REST requests and sign-out with a local fixture; multi-dog sample history, copy/edit and guest planner.');

}finally{sock?.close();const closed=browser.exitCode===null?once(browser,'exit').catch(()=>{}):Promise.resolve();browser.kill();await Promise.race([closed,pause(2000)]);await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});}

