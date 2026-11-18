import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groomPlan, printableData} from '../public/print-plan.js';

const plan = data => ({date:'2026-11-18T12:00:00.000Z',status:'Owner request · not agreed',data:{name:'Milo',service:'Bath + haircut',...data}});
const sheet = html => html.split('</article>')[0];

test('basic output protects contact choice and excludes stale advanced styling and photos',()=>{
  const input=plan({mode:'basic',owner:'PRIVATE OWNER',phone:'PRIVATE PHONE',secondaryOwner:'PRIVATE BACKUP',secondaryPhone:'PRIVATE BACKUP PHONE',
    head:'STALE STYLE',currentFace:'PRIVATE IMAGE',reference:'PRIVATE REFERENCE',priorities:['Comfort first','Match my photo'],
    pins:{sensitiveMap:[{x:25,y:50,area:'Left paw',note:'Tender'}],currentFace:[{note:'STALE PHOTO NOTE'}]}});
  const html=groomPlan(input);
  assert.match(html,/BASIC<br>GROOM/);
  for(const text of ['PRIVATE','STALE','Match my photo','View photos &amp; callouts','groom-screen-photos']) assert.ok(!html.includes(text),text);
  assert.match(html,/Contact details excluded by owner/);
  assert.match(html,/Left paw/);assert.match(html,/Tender/);
});

test('advanced bath-only plans retain current-coat notes but not haircut references',()=>{
  const html=groomPlan(plan({mode:'advanced',service:'Bath only',head:'STALE HEAD',reference:'STALE REFERENCE',currentSide:'data:image/png;base64,CURRENT',
    pins:{currentSide:[{area:'Side',note:'Current coat note'}],reference:[{note:'STALE NOTE'}]}}));
  assert.match(html,/ADVANCED<br>GROOM/);assert.match(html,/Current coat note/);assert.ok(!html.includes('STALE'));
  assert.ok(!sheet(html).includes('data:image'));assert.match(html,/groom-screen-photos/);
});

test('sensitive pins preserve their exact guide and positions; text-only notes never get invented positions',()=>{
  const html=sheet(groomPlan(plan({guide:'terrier',pins:{sensitiveMap:[
    {x:26.5,y:53,area:'Left side',note:'Small lump'},
    {x:null,y:null,area:'Paw',note:'Text-only note'},
    {x:120,y:20,note:'Out-of-range legacy note'}
  ]}})));
  assert.match(html,/assets\/guide-terrier.jpg/);assert.match(html,/left:26.5%;top:53%/);
  assert.equal((html.match(/class="gs-map-pin"/g)||[]).length,1);
  for(const note of ['Small lump','Text-only note','Out-of-range legacy note'])assert.ok(html.includes(note));
  assert.equal((html.match(/Area note · not pinned on guide/g)||[]).length,2);
});

test('all five permissions remain independent and missing instructions never become consent',()=>{
  const html=sheet(groomPlan(plan({time:'Up to 15 extra minutes',fees:'Ask before any added fee'})));
  assert.match(html,/Up to 15 extra minutes/);assert.match(html,/Ask before any added fee/);
  assert.equal((html.match(/Not specified · discuss before starting/g)||[]).length,3);
  assert.match(html,/No reply is not permission/);assert.match(html,/Owner request, not an agreement/);
});

test('full plan retains notes, team, both contacts and photograph annotations without printing uploads',()=>{
  const input=plan({mode:'advanced',visit:'2026-11-20',birthday:'2023-04-12',age:'3 years',breed:'Doodle',weight:'28 lb',
    owner:'Alex',phone:'555-0101',email:'alex@example.test',channel:'Text',secondaryOwner:'Sam',secondaryPhone:'555-0102',includeContact:true,
    salon:'Maple & Mutt',groomer:'Jamie',groomerAddress:'42 Oak St',groomerPhone:'555-0148',groomerEmail:'groomer@example.test',
    priorityNote:'Teddy face please',finish:'Some extra fluff',style:'Simple & practical',head:'Rounded',beard:'Short & tidy',fringe:'Clear of eyes',
    body:'Medium',length:'Half an inch',legs:'Slightly fuller',paws:'Tidy outline',ears:'Keep long',tail:'Fluffy tip',
    faceNotes:'FACE NOTE',bodyNotes:'BODY NOTE',earNotes:'EAR NOTE',coat:'Some tangles',lastGroom:'7 weeks ago',brushing:'Twice weekly',coatNotes:'COAT NOTE',
    spotArea:'Left ear',sensitive:'Yes',spotNotes:'LEGACY SPOT',spotPhoto:'data:image/png;base64,COAT',
    anxiety:'A little nervous',helps:['Quiet space'],triggers:['Loud dryer'],handlingNotes:'HANDLING NOTE',
    allergies:'Fragrance',meds:'None reported',mobility:'Standing breaks',comfortNotes:'COMFORT NOTE',
    currentFace:'data:image/png;base64,FACE',reference:'data:image/png;base64,DESIRED',source:'Last groom',likesPhoto:'Rounded face, long ears',
    pins:{currentFace:[{area:'Head',note:'PHOTO NOTE'}],reference:[{note:'REFERENCE NOTE'}]}});
  const original=structuredClone(input),html=sheet(groomPlan(input));
  for(const value of ['20 Nov 2026','12 Apr 2023','18 Nov 2026','Alex','555-0102','groomer@example.test',
    'FACE NOTE','BODY NOTE','EAR NOTE','COAT NOTE','LEGACY SPOT','HANDLING NOTE','COMFORT NOTE','PHOTO NOTE','REFERENCE NOTE',
    'Half an inch','Last groom','Rounded face, long ears'])assert.ok(html.includes(value),value);
  assert.ok(!html.includes('data:image'));assert.ok(!html.includes('<svg'));
  assert.match(html,/QR sharing coming soon/);assert.deepEqual(input,original);
});

test('notes are escaped and never truncated, with unknown care distinguished from none',()=>{
  const note='Long owner note. '.repeat(80)+'<img src=x onerror=alert(1)>';
  const html=sheet(groomPlan(plan({comfortNotes:note,name:'<script>bad</script>'})));
  assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal((html.match(/Long owner note\./g)||[]).length,80);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('None known'));
  assert.equal(printableData(plan({includeContact:false,owner:'Private'})).owner,undefined);
});
