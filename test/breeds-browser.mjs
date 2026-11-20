import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {installAuthFixture} from './auth-fixture.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=spawn(process.execPath,['scripts/preview.mjs'],{windowsHide:true,env:{...process.env,PORT:'4387'},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Preview exited '+code)));server.stderr.on('data',x=>process.stderr.write(x));});
console.log('App preview ready');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const owner='11111111-1111-4111-8111-111111111111',dog='22222222-2222-4222-8222-222222222222';
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(installAuthFixture);
  const page=await context.newPage();await page.goto('http://127.0.0.1:4387/#/account');
  await page.evaluate(({owner,dog})=>{
    sessionStorage.setItem('test:rows:fd_owner_profiles',JSON.stringify([{owner_id:owner,display_name:'Taylor',phone:'',city:'Tampa',state:'FL'}]));
    sessionStorage.setItem('test:rows:fd_dogs',JSON.stringify([{id:dog,owner_id:owner,name:'Milo',breed:'Legacy custom mix',care_defaults:{}}]));
  },{owner,dog});
  await page.locator('[name=email]').fill('owner@example.test');await page.locator('[name=password]').fill('fixture password one');await page.locator('[type=submit]').click();
  console.log('Signed in');
  await page.locator('a[href="#/dog-profile/'+dog+'"]').waitFor();
  await page.goto('http://127.0.0.1:4387/#/edit-dog/'+dog);
  assert.equal(await page.locator('[name=breed]').inputValue(),'Legacy custom mix');
  assert.equal(await page.locator('#fd-breed-options option').count(),320);
  for(const [entered,saved] of [['unkown','Unknown'],['Golden Doodle','Goldendoodle'],['My unlisted cross','My unlisted cross']]){
    await page.locator('[name=breed]').fill(entered);await page.locator('[type=submit]').click();
    await page.locator('[name=allergies]').waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:rows:fd_dogs'))[0].breed),saved);
    await page.goto('http://127.0.0.1:4387/#/edit-dog/'+dog);
    assert.equal(await page.locator('[name=breed]').inputValue(),saved);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log('Breed selection, aliases, custom mixes, saved profile reload and mobile layout passed.');
} finally {await browser.close();server.kill();}
