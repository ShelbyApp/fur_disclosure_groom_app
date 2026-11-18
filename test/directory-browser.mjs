// Runs against scripts/preview.mjs. Auth and API responses stay on localhost.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {installAuthFixture} from './auth-fixture.mjs';
const data=JSON.parse(await readFile('supabase/data/providers.json','utf8'));
const appUrl=process.env.TEST_APP_URL||'http://127.0.0.1:4381/';
const profile=await mkdtemp(path.join(os.tmpdir(),'fd-directory-browser-'));
const browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f){let last;for(let i=0;i<100;i++){try{const x=await f();if(x)return x;}catch(e){last=e;}await pause(100);}throw last||Error('Timed out');}
let sock;
try{
 const port=await until(async()=>(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 sock=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((ok,no)=>{sock.onopen=ok;sock.onerror=no;});
 let seq=0;const pending=new Map(),errors=[];
 sock.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);};
 const c=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});sock.send(JSON.stringify({id,method,params}));});
 async function run(expression){const r=await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 const q=JSON.stringify,click=selector=>run(`document.querySelector(${q(selector)}).click()`);
 const fill=(selector,value,event='input')=>run(`(()=>{const el=document.querySelector(${q(selector)});el.value=${q(value)};el.dispatchEvent(new Event(${q(event)},{bubbles:true}));})()`);
 const has=selector=>until(()=>run(`!!document.querySelector(${q(selector)})`));
 const count=selector=>run(`document.querySelectorAll(${q(selector)}).length`);
 const text=()=>run('document.querySelector("main").innerText');
 const choose=async name=>{await fill('#directory-city',name);await has('[data-directory-city]');await click('[data-directory-city]');await has('.directory-card');};
 const screenshot=async name=>{await run('document.fonts.ready.then(()=>true)');await mkdir('test-results',{recursive:true});const result=await c('Page.captureScreenshot',{format:'png'});await writeFile('test-results/'+name+'.png',Buffer.from(result.data,'base64'));};
 await c('Page.enable');await c('Runtime.enable');await c('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await c('Page.addScriptToEvaluateOnNewDocument',{source:'('+installAuthFixture.toString()+')('+q(data)+')'});
 await c('Page.navigate',{url:appUrl});await has('[data-owner-form=signin]');
 const owner='11111111-1111-4111-8111-111111111111',dog='22222222-2222-4222-8222-222222222222';
 await run(`sessionStorage.setItem('test:rows:fd_owner_profiles',${q(JSON.stringify([{owner_id:owner,display_name:'Directory tester',city:'Sarasota',state:'FL'}]))});sessionStorage.setItem('test:rows:fd_dogs',${q(JSON.stringify([{id:dog,owner_id:owner,name:'Milo',breed:'Terrier',care_defaults:{}}]))});`);
 await fill('[name=email]','owner@example.test');await fill('[name=password]','fixture password one');await click('[type=submit]');await has('a[href="#/find-groomer/new"]');
 await click('a[href="#/find-groomer/new"]');await has('[data-directory-city]');
 assert.equal(await count('.directory-card'),0);await click('[data-directory-city]');await has('.directory-card');
 assert.equal(await count('.directory-card'),20);await click('[data-directory-page=next]');await until(async()=>await count('.directory-card')===5);
 await choose('St Pete');assert.equal(await count('.directory-card'),8);
 await fill('#directory-mode','mobile','change');await until(async()=>await count('.directory-card')===4);
 await fill('#directory-name','Pupt');await until(async()=>await count('.directory-card')===1);assert.match(await text(),/Puptown/);
 await fill('#directory-city','sa');await pause(300);await fill('#directory-city','Tampa');await has('[data-directory-city="tampa-fl"]');await pause(700);
 assert.equal(await count('[data-directory-city="sarasota-fl"]'),0);
 await click('[data-directory-city="tampa-fl"]');await has('.directory-card');assert.equal(await count('.directory-card'),1);
 await screenshot('directory-mobile');assert.ok(await run('document.documentElement.scrollWidth<=innerWidth'));
 await click('[data-directory-select]');await has('.groomer-card');assert.match(await text(),/Puptown/);
 const saved=await run('JSON.parse(sessionStorage.getItem("test:rows:fd_groomers"))[0]');assert.equal(saved.entry_source,'auto_populated');assert.equal(saved.name,'');
 // Re-select the same business: no duplicate owner contact.
 await click('a[href="#/find-groomer/new"]');await has('#directory-city');await choose('Tampa');await fill('#directory-name','Pupt');await until(async()=>await count('.directory-card')===1);await click('[data-directory-select]');await has('.groomer-card');assert.equal(await count('.groomer-card'),1);
 await click(`a[href="#/dog-profile/${dog}"]`);await has('[data-owner-action=start]');await click('[data-owner-action=start]');await has('[data-mode=basic]');await click('[data-mode=basic]');await has('[data-create-groomer]');await fill('[name=visit]','2026-12-02');
 await click('[data-create-groomer]');await has('#directory-city');await choose('St. Petersburg');
 await run('sessionStorage.setItem("test:directory-fail","yes")');await fill('#directory-name','Pupt');await has('[data-directory-retry]');assert.equal(await count('.directory-card'),0);
 await run('sessionStorage.removeItem("test:directory-fail")');await click('[data-directory-retry]');await has('.directory-card');
 await c('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:false});assert.ok(await run('document.documentElement.scrollWidth<=innerWidth'));
 await click('[data-directory-select]');await has('[data-saved-groomer]:not(:disabled)');assert.match(await text(),/Puptown/);assert.equal(await run('document.querySelector("[name=visit]").value'),'2026-12-02');
 // Unsupported city still permits a private contact and review submission.
 await click('[data-create-groomer]');await has('#directory-city');await fill('#directory-city','Orlando');await until(()=>run('document.querySelector("#directory-status").textContent.includes("isn’t in our directory")'));
 await click('[data-directory-create]');await has('[data-owner-form=groomer]');await c('Page.reload');await has('[data-owner-form=groomer]');
 await fill('[name=business]','New local groomer');await fill('[name=phone]','813-555-0100');await click('[name=location_mobile]');await click('[name=service_boarding]');await click('[type=submit]');
 await has('[data-saved-groomer]:not(:disabled)');assert.match(await text(),/New local groomer/);assert.equal(await run('document.querySelector("[name=visit]").value'),'2026-12-02');
 const submission=await run('JSON.parse(sessionStorage.getItem("test:last-submission"))');assert.equal(submission.p_city_id,null);assert.equal(submission.p_city_text,'Orlando');assert.deepEqual(submission.p_services,{grooming:true,daycare:null,boarding:true});
 assert.deepEqual(errors,[]);console.log('Passed directory browser: city-first search, aliases, 20-row pages, mobile coverage, stale results, retry, saved-contact deduplication, visit return, missing business and refresh at 320/390px.');
}finally{sock?.close();const closed=browser.exitCode===null?once(browser,'exit').catch(()=>{}):Promise.resolve();browser.kill();await Promise.race([closed,pause(2000)]);if(path.dirname(path.resolve(profile))===path.resolve(os.tmpdir())&&path.basename(profile).startsWith('fd-directory-browser-'))await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150}).catch(()=>{});}
