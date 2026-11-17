import {test} from 'node:test';import assert from 'node:assert/strict';import {intake,byId,incomplete,snapshot,flow} from '../public/flow.js';
test('bath-only and cleared coat concerns cannot leak stale requests',()=>{const a={service:'Bath only',coat:'No tangles noticed',ears:'Shorter',reference:'old image',spotNotes:'old note',currentFace:'current image',name:'Milo'};const snap=snapshot(a);for(const k of ['ears','reference','spotNotes'])assert.ok(!(k in snap.data));assert.equal(snap.data.currentFace,'current image');assert.ok(!intake(a).some(p=>p.cut));assert.ok(intake({...a,service:'Bath + haircut',coat:'Some tangles'}).some(p=>p.id==='spots'));});
test('no inferred approvals or contact included by default',()=>{const a={name:'Milo',phone:'123',owner:'Alex',email:'test@example.com',channel:'Text',time:'Up to 15 extra minutes'};for(const k of ['fees','mats','distress','unreachable'])assert.ok(incomplete(byId[k],a));for(const k of ['phone','owner','email','channel'])assert.ok(!(k in snapshot(a).data));assert.equal(snapshot({...a,includeContact:true}).data.phone,'123');assert.ok(incomplete(byId['review-care'],{checked:true}));});
test('snapshot is independent of the draft and keeps both identifiers',()=>{const a={name:'Milo',salon:'Maple & Mutt',groomer:'Jamie',priorities:['Easy upkeep']};const s=snapshot(a);a.priorities.push('Comfort first');a.groomer='Kim';assert.equal(s.data.groomer,'Jamie');assert.equal(s.data.salon,'Maple & Mutt');assert.equal(s.data.priorities.length,1);assert.match(s.status,/not agreed/);});

test('primary and secondary contacts share one explicit inclusion choice',()=>{
  const answers={name:'Milo',owner:'Alex',phone:'555-0100',email:'alex@example.test',secondaryOwner:'Sam',secondaryPhone:'555-0101'};
  const hidden=snapshot(answers).data;
  for(const key of ['owner','phone','email','secondaryOwner','secondaryPhone'])assert.equal(hidden[key],undefined);
  const included=snapshot({...answers,includeContact:true}).data;
  assert.equal(included.secondaryOwner,'Sam');assert.equal(included.secondaryPhone,'555-0101');
  answers.secondaryPhone='555-0102';assert.equal(included.secondaryPhone,'555-0101');
});
test('every route has its own spec, and login is not a stage',async()=>{const fs=await import('node:fs/promises');const docs=await fs.readdir('docs/screens');assert.equal(new Set(flow.map(p=>p.id)).size,flow.length);for(const p of flow)assert.ok(docs.some(f=>f.endsWith('-'+p.id+'.md')),p.id);});


test('basic excludes advanced images, their pins and styling, and retains sensitive spots without matting', () => {
  const sensitive = [{x:26.5, y:53, area:'Side / belly', note:'Tender lump on the left side'}];
  const answers = {mode:'basic', service:'Bath + haircut', coat:'No tangles noticed', guide:'terrier',
    currentFace:'image1', reference:'image2', referenceTwo:'image3', finish:'Balanced', head:'Rounded',
    priorities:['Easy upkeep','Match my photo'], pins:{sensitiveMap:sensitive,reference:sensitive,currentFace:sensitive,referenceTwo:sensitive}};
  const data = snapshot(answers).data;
  for (const field of ['currentFace','reference','referenceTwo','finish','head']) assert.ok(!(field in data));
  assert.deepEqual(Object.keys(data.pins),['sensitiveMap']);
  assert.deepEqual(data.pins.sensitiveMap,sensitive);
  assert.deepEqual(data.priorities,['Easy upkeep']);
  assert.equal(data.guide,'terrier');
  for (const field of ['time','fees','distress','handling','spots']) assert.ok(intake(answers).some(page=>page.id===field));
});
test('advanced returns notes only for included photos on this visit', () => {
  const note = [{x:20,y:45,note:'Keep fluffy'}];
  const answers = {service:'Bath + haircut',currentSide:'now',referenceTwo:'cut',pins:{referenceTwo:note,currentSide:note,reference:note}};
  const data = snapshot(answers).data;
  assert.equal(data.mode,'advanced');
  assert.deepEqual(Object.keys(data.pins).sort(),['currentSide','referenceTwo']);
  assert.deepEqual(Object.keys(snapshot({...answers,service:'Bath only'}).data.pins),['currentSide']);
  note[0].note='Changed later';assert.equal(data.pins.referenceTwo[0].note,'Keep fluffy');
});
