// Geometry is kept in memory only. Never write Google responses to storage or Supabase.
const geometryCache=new Map();
let apiPromise,geocoder,requests=0;
const geocodeLimit=99; // At most 99 geocodes plus one Maps JavaScript load per page session.
export const mapStyles=[
  {elementType:'geometry',stylers:[{color:'#f8f2e7'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#60436b'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#fffaf0'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#dcd4ec'}]},
  {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#e9eddc'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#f6dc85'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]}
];
function loadMaps() {
  if(globalThis.google?.maps?.Map)return Promise.resolve(globalThis.google.maps);
  if(apiPromise)return apiPromise;
  const key=globalThis.FD_CONFIG?.googleMapsBrowserKey;
  if(!key)return Promise.reject(Error('Map is not configured'));
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(Error('Map timed out')),20000);
    const finish=error=>{clearTimeout(timer);error?reject(error):resolve(globalThis.google.maps);};
    globalThis.fdDirectoryMapsReady=()=>finish();
    globalThis.gm_authFailure=()=>{finish(Error('Map authorization failed'));globalThis.dispatchEvent(new Event('fd-map-error'));};
    script.onerror=()=>finish(Error('Map could not load'));
    const url=new URL('https://maps.googleapis.com/maps/api/js');
    url.search=new URLSearchParams({key,callback:'fdDirectoryMapsReady',loading:'async',v:'quarterly'});
    script.src=url.href;script.async=true;document.head.append(script);
  });
  return apiPromise;
}
async function locate(maps,request) {
  const key=JSON.stringify(request);
  if(geometryCache.has(key))return geometryCache.get(key);
  if(requests>=geocodeLimit)return null;
  requests++;
  geocoder??=new maps.Geocoder();
  const result=geocoder.geocode(request).then(({results})=>{
    const first=results?.[0];
    // Do not turn an ambiguous or partial address match into an exact business pin.
    if(!first||first.partial_match)return null;
    return {location:first.geometry.location,viewport:first.geometry.viewport};
  }).catch(()=>null);
  geometryCache.set(key,result);
  return result;
}
export function mountDirectoryMap(canvas,note,onSelect) {
  let alive=true,map,pins=[],version=0,selectedId=null,currentCity=null;
  const message=text=>{if(alive)note.textContent=text;};
  const unavailable=()=>{canvas.hidden=true;message('The map is unavailable. Search by business name or see all results below.');};
  globalThis.addEventListener('fd-map-error',unavailable);
  const ready=loadMaps().then(maps=>{
    if(!alive)return null;
    map=new maps.Map(canvas,{center:{lat:27.65,lng:-82.55},zoom:8,styles:mapStyles,
      renderingType:maps.RenderingType.RASTER,gestureHandling:'cooperative',clickableIcons:false,
      mapTypeControl:false,streetViewControl:false,fullscreenControl:false,zoomControl:true});
    message('Choose a city to explore care nearby.');return maps;
  }).catch(()=>{if(alive)unavailable();return null;});
  function clearPins(){pins.forEach(pin=>pin.setMap(null));pins=[];selectedId=null;}
  function select(id){selectedId=id;pins.forEach(pin=>{pin.button?.setAttribute('aria-pressed',String(pin.row.id===id));});}
  async function update(city,rows=[],{capped=false}={}) {
    const revision=++version,cityChanged=currentCity?.id!==city?.id;clearPins();
    const maps=await ready;if(!alive||revision!==version||!maps)return;
    if(!city){currentCity=null;map.setCenter({lat:27.65,lng:-82.55});map.setZoom(8);message('Choose a city to explore care nearby.');return;}
    message('Finding locations on the map…');
    if(cityChanged){
      const geometry=await locate(maps,{address:`${city.name}, ${city.state}, ${city.country||'US'}`});
      if(!alive||revision!==version)return;
      currentCity=city;
      if(geometry?.viewport)map.fitBounds(geometry.viewport,24);
      else if(geometry?.location){map.setCenter(geometry.location);map.setZoom(11);}
    }
    class Pin extends maps.OverlayView {
      constructor(row,position,index){super();this.row=row;this.position=position;this.index=index;this.setMap(map);}
      onAdd(){
        const button=document.createElement('button');this.button=button;
        button.type='button';button.className='directory-map-pin';button.textContent=String(this.index);
        button.title=this.row.business_name;button.setAttribute('aria-label','Preview '+this.row.business_name);
        button.setAttribute('aria-pressed',String(this.row.id===selectedId));
        button.addEventListener('click',()=>{select(this.row.id);onSelect(this.row);});
        maps.OverlayView.preventMapHitsAndGesturesFrom(button);this.getPanes().overlayMouseTarget.append(button);
      }
      draw(){const point=this.getProjection().fromLatLngToDivPixel(this.position);if(point&&this.button){this.button.style.left=point.x+'px';this.button.style.top=point.y+'px';}}
      onRemove(){this.button?.remove();}
    }
    const fixed=rows.filter(row=>row.location_flags?.fixed_location===true&&row.address);
    for(const row of fixed){
      if(!alive||revision!==version)return;
      // Use the independently sourced street address, not a Places details lookup.
      const geometry=await locate(maps,{address:row.address,componentRestrictions:{country:'US'}});
      if(!alive||revision!==version)return;
      if(geometry)pins.push(new Pin(row,geometry.location,pins.length+1));
    }
    const mobile=rows.some(row=>row.location_flags?.mobile===true);
    message((pins.length?`${pins.length} locations · Tap a pin to preview a business.`:'No mapped salon locations for these filters.')+
      (mobile?' Mobile providers serve the selected area; use search or see all results to find them.':'')+
      (pins.length<fixed.length?' Some locations could not be mapped; they remain in search results.':'')+
      (capped?' The map shows the first 100 matches. Search or see all results for more.':''));
  }
  return {update,clearSelection:()=>select(null),destroy(){alive=false;version++;clearPins();globalThis.removeEventListener('fd-map-error',unavailable);}};
}
