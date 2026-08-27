import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2 } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [14.8137, 120.9550];

const LocationPicker = ({ latitude, longitude, onChange, className = '' }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (mapInstance.current) return;
    const startCenter = (latitude && longitude) ? [latitude, longitude] : DEFAULT_CENTER;
    const map = L.map(mapRef.current, {
      center: startCenter,
      zoom: latitude && longitude ? 15 : 12,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker(startCenter, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      onChange(lat, lng);
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    });
    mapInstance.current = map;
    markerRef.current = marker;
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (mapInstance.current && markerRef.current && latitude && longitude) {
      const current = markerRef.current.getLatLng();
      if (Math.abs(current.lat - latitude) > 0.0001 || Math.abs(current.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstance.current.setView([latitude, longitude], mapInstance.current.getZoom());
      }
    }
  }, [latitude, longitude]);

  useEffect(() => { if (fullscreen && mapInstance.current) setTimeout(()=>mapInstance.current.invalidateSize(), 200); }, [fullscreen]);

  const MapDiv = (
    <div ref={mapRef} className={`rounded-xl overflow-hidden ${className} w-full h-full min-h-[220px]`} />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 p-2 sm:p-4 flex flex-col" onClick={()=>setFullscreen(false)}>
        <div className="flex justify-between items-center mb-2" onClick={e=>e.stopPropagation()}>
          <span className="text-white text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Pick location - click or drag pin</span>
          <button onClick={()=>setFullscreen(false)} className="bg-white hover:bg-gray-100 rounded-full px-4 py-2 shadow text-sm font-semibold">✕ Exit</button>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden bg-white relative" onClick={e=>e.stopPropagation()}>
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {MapDiv}
        <button type="button" onClick={()=>setFullscreen(true)} className="absolute top-2 right-2 bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1 hover:bg-gray-50 z-[400]">
          <Maximize2 className="w-3.5 h-3.5" /> Full
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-sti-gray">
        <MapPin className="w-3.5 h-3.5" />
        Click on map or drag pin to set location - no need to type lat/lng
      </p>
    </div>
  );
};

export default LocationPicker;
