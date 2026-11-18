// Only browser tests install this API double. It sends no Google requests.
export function installMapFixture(){
  window.testGeocodes=[];
  class Map {
    constructor(element,options){this.element=element;this.options=options;element.style.position='relative';this.pane=document.createElement('div');element.append(this.pane);}
    setCenter(center){this.center=center;}
    setZoom(zoom){this.zoom=zoom;}
    fitBounds(bounds){this.bounds=bounds;window.testMapBounds=bounds;}
  }
  class OverlayView {
    setMap(map){if(this.map)this.onRemove();this.map=map;if(map){this.onAdd();this.draw();}}
    getPanes(){return {overlayMouseTarget:this.map.pane};}
    getProjection(){return {fromLatLngToDivPixel:position=>({x:30+(position.id%6)*48,y:35+Math.floor(position.id/6)*50})};}
    static preventMapHitsAndGesturesFrom(){}
  }
  class Geocoder {
    async geocode(request){window.testGeocodes.push(request);const id=window.testGeocodes.length;
      await new Promise(resolve=>setTimeout(resolve,20));
      if(window.testGeocodeFailure)throw Error('Fixture geocoding failure');
      return {results:[{geometry:{location:{id},viewport:{address:request.address}}}]};
    }
  }
  window.google={maps:{Map,OverlayView,Geocoder,RenderingType:{RASTER:'RASTER'}}};
}
