import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';

function fixture(geocode){
  const events=new EventTarget(),views=[];
  class Map {
    constructor(){views.push(this);}
    setCenter(){} setZoom(){}
    fitBounds(bounds){this.bounds=bounds;}
  }
  globalThis.google={maps:{Map,Geocoder:class {geocode(request){return geocode(request);}},RenderingType:{RASTER:'RASTER'},OverlayView:class {}}};
  globalThis.addEventListener=events.addEventListener.bind(events);
  globalThis.removeEventListener=events.removeEventListener.bind(events);
  // Any attempt to persist Google geometry should fail this test.
  globalThis.localStorage=globalThis.sessionStorage={setItem(){throw Error('Geometry must remain in memory');}};
  return views;
}
const result=address=>({results:[{geometry:{location:{lat:27,lng:-82},viewport:address}}]});
test('map geocoding is cached, skips mobile addresses, and stops at 99 attempts without retrying failures',async()=>{
  const requests=[];
  fixture(async request=>{requests.push(request);if(request.address.startsWith('Failure'))throw Error('Quota or API failure');return result(request.address);});
  const {mountDirectoryMap}=await import('../public/directory-map.js?budget');
  const note={},view=mountDirectoryMap({},note,()=>{}),city={id:'first',name:'Failure',state:'FL'};
  await view.update(city);await view.update(null);await view.update(city);assert.equal(requests.length,1);
  for(let i=0;i<105;i++)await view.update({id:String(i),name:'City '+i,state:'FL'},[{address:'Private mobile base',location_flags:{mobile:true}}]);
  assert.equal(requests.length,99);assert.ok(requests.every(r=>!r.address.includes('Private')));
  view.destroy();
});
test('a stale city geocode cannot recenter the latest city or update an unmounted map',async()=>{
  const pending=new Map(),views=fixture(request=>new Promise(resolve=>pending.set(request.address,resolve)));
  const {mountDirectoryMap}=await import('../public/directory-map.js?race');
  const note={},view=mountDirectoryMap({},note,()=>{});
  const first=view.update({id:'a',name:'First',state:'FL'});await setImmediate();
  const second=view.update({id:'b',name:'Second',state:'FL'});await setImmediate();
  pending.get('Second, FL, US')(result('second'));await second;
  pending.get('First, FL, US')(result('first'));await first;
  assert.equal(views[0].bounds,'second');
  const third=view.update({id:'c',name:'Third',state:'FL'});await setImmediate();view.destroy();
  const message=note.textContent;pending.get('Third, FL, US')(result('third'));await third;
  assert.equal(views[0].bounds,'second');assert.equal(note.textContent,message);
});
