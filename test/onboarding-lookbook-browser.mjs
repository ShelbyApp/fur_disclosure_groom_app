// PLAYWRIGHT_MODULE points at a local Playwright installation; no production records are used.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {installAuthFixture} from './auth-fixture.mjs';
const {chromium,webkit}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=spawn(process.execPath,['scripts/preview.mjs'],{windowsHide:true,env:{...process.env,PORT:'4388'},stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:4388/';
const owner='11111111-1111-4111-8111-111111111111',dog='22222222-2222-4222-8222-222222222222';
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
await mkdir('test-results',{recursive:true});
async function signIn(page){await page.locator('[name=email]').fill('owner@example.test');await page.locator('[name=password]').fill('fixture password one');await page.locator('[type=submit]').click();}
async function seed(page){await page.evaluate(({owner,dog})=>{
  sessionStorage.setItem('test:rows:fd_owner_profiles',JSON.stringify([{owner_id:owner,display_name:'Taylor',phone:'555-0100',city:'Tampa',state:'FL'}]));
  sessionStorage.setItem('test:rows:fd_dogs',JSON.stringify([{owner_id:owner,id:dog,name:'Milo',breed:'Doodle',care_defaults:{}}]));
},{owner,dog});}
async function visible(page,selector){await page.locator(selector).first().waitFor({state:'visible'});}
try{
for(const [name,engine,options] of [['chromium',chromium,{executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}],['webkit',webkit,{}]]){
  if(process.env.CHROMIUM_ONLY==='1'&&name!=='chromium')continue;
  const browser=await engine.launch({headless:true,...options});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(installAuthFixture);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?role=groomer&source=landing-onboarding#/create-account');
    await visible(page,'[name=signup_role]');assert.equal(await page.locator('[name=signup_role]').inputValue(),'groomer');
    assert.equal(await page.locator('.login-pup').count(),1);
    await page.locator('[name=email]').fill('owner@example.test');await page.locator('[name=password]').fill('fixture password one');await page.locator('[name=confirmation]').fill('fixture password one');
    await page.locator('[type=submit]').click();await page.getByRole('heading',{name:'Check your email.'}).waitFor();
    const signup=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:signup')));
    assert.equal(signup.data.fd_account_role,'groomer');assert.equal(signup.redirect,base);
    // New-tab/email-confirmation semantics: metadata, not the URL or pending role, determines entry.
    await page.evaluate(()=>sessionStorage.removeItem('fd:signup-role'));await page.goto(base+'#/account');await signIn(page);
    await visible(page,'[data-owner-form=owner]');assert.ok(!(await page.locator('main').innerText()).includes('add your first dog'));
    await page.locator('[name=display_name]').fill('Taylor');await page.locator('[type=submit]').click();await visible(page,'.groomer-welcome');
    assert.match(await page.locator('.groomer-welcome').innerText(),/coming soon/);
    await page.screenshot({path:'test-results/'+name+'-groomer-entry.png',fullPage:true});
    await page.reload();await visible(page,'.groomer-welcome');
    await page.locator('[data-owner-action=signout]').click();await visible(page,'[data-owner-form=signin]');
    // An existing owner never becomes a groomer simply by following a marketing link.
    await page.evaluate(()=>sessionStorage.setItem('test:user-metadata','{}'));await seed(page);
    await page.goto(base+'?role=groomer#/account');await signIn(page);await visible(page,'a[href="#/dog-profile/'+dog+'"]');
    assert.ok(page.url().endsWith('#/profile'));
    await page.locator('a[href="#/dog-profile/'+dog+'"]').click();await page.locator('.lookbook-add').click();
    await visible(page,'[name=visibility]');assert.equal(await page.locator('[name=visibility]:checked').inputValue(),'private');
    const order=await page.evaluate(()=>{const pick=document.querySelector('.photo-pickers').getBoundingClientRect(),privacy=document.querySelector('.photo-visibility').getBoundingClientRect(),provider=document.querySelector('.photo-provider').getBoundingClientRect();return pick.bottom<=privacy.top&&privacy.bottom<=provider.top;});assert.ok(order);
    assert.ok(await page.locator('[type=submit]').isDisabled());
    await page.locator('[data-lookbook-photo]').first().setInputFiles({name:'milo.jpg',mimeType:'image/jpeg',buffer:await readFile('public/assets/hero-pup-v2-720.jpg')});
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.locator('[name=visibility][value=public]').check();await page.locator('#photo-provider-query').fill('daycare');
    await visible(page,'[data-photo-provider="0"]');await page.locator('[data-photo-provider="0"]').click();
    await page.locator('[name=caption]').fill('Milo’s fresh look');
    assert.equal(await page.locator('[name=life_stage]').inputValue(),'unknown');await page.locator('[name=life_stage]').selectOption('puppy');
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow at '+width);
      assert.ok(await page.locator('#app').evaluate(el=>el.getBoundingClientRect().width<=432));
    }
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/'+name+'-photo-sharing.png',fullPage:true});
    await page.locator('[type=submit]').click();await visible(page,'.polaroid[data-photo-id]');
    assert.match(await page.locator('.polaroid figcaption').innerText(),/Public · Happy Daycare/);
    let rows=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:rows:fd_dog_photos')));assert.equal(rows[0].visibility,'public');assert.equal(rows[0].life_stage,'puppy');assert.equal(rows[0].provider_id,'33333333-3333-4333-8333-333333333333');
    await page.locator('.polaroid a').click();await visible(page,'[data-remove-provider]');
    assert.equal(await page.locator('[name=visibility]:checked').inputValue(),'public');
    assert.equal(await page.locator('[name=life_stage]').inputValue(),'puppy');await page.locator('[name=life_stage]').selectOption('adult');
    await page.locator('[name=visibility][value=private]').check();await page.locator('[data-remove-provider]').click();
    await page.locator('[type=submit]').click();await visible(page,'.polaroid[data-photo-id]');
    rows=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:rows:fd_dog_photos')));assert.equal(rows[0].visibility,'private');assert.equal(rows[0].life_stage,'adult');assert.equal(rows[0].provider_id,null);
    await page.locator('.lookbook-add').click();await page.locator('#photo-provider-query').fill('slow');
    await page.waitForFunction(()=>document.querySelector('#photo-provider-status').textContent.includes('Finding'));
    await page.locator('#photo-provider-query').fill('none');await page.waitForFunction(()=>document.querySelector('#photo-provider-status').textContent.includes('No matches'));
    await page.waitForTimeout(850);assert.equal(await page.locator('[data-photo-provider]').count(),0);
    await page.evaluate(()=>sessionStorage.setItem('test:photo-search-fail','yes'));await page.locator('#photo-provider-query').fill('tampa');
    await page.waitForFunction(()=>document.querySelector('#photo-provider-status').textContent.includes('unavailable'));
    await page.evaluate(()=>sessionStorage.setItem('test:legacy-photo-schema','yes'));
    await page.locator('[data-lookbook-photo]').first().setInputFiles({name:'milo.jpg',mimeType:'image/jpeg',buffer:await readFile('public/assets/studio-garden.jpg')});
    await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
    await page.locator('[name=visibility][value=public]').check();await page.locator('[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#account-message').textContent.includes('database update'));
    // An old database may accept a private untagged upload, but never silently a public one.
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:rows:fd_dog_photos')).length),1);
    await page.locator('[name=visibility][value=private]').check();await page.locator('[type=submit]').click();await visible(page,'.polaroid[data-photo-id]');
    assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('test:rows:fd_dog_photos')).length),2);
    assert.deepEqual(errors,[]);await context.close();console.log(name+': signup role, existing owner, profile entry, upload/sharing/edit, search races, errors and responsive layouts passed.');
  }finally{await browser.close();}
}
}finally{server.kill();}
