import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2 } from 'lucide-react';

// Fix Leaflet's default marker icons, which break under Vite's bundler
// because the image paths it expects don't survive bundling. Loading them
// from a CDN sidesteps that — no API key needed, this is just image assets.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// STI Sta. Maria, Bulacan — sensible default center when no pin is set yet.
const DEFAULT_CENTER = [14.8137, 120.9550];

// Free, key-less interactive map (OpenStreetMap tiles via Leaflet) that lets
// the admin click or drag a pin to set a company's exact location.
// Real Google Maps' clickable JS map requires a Google Cloud API key
// (free-tier available, but needs a billing card on file) — this avoids
// that requirement entirely while still giving a proper interactive pin.
const LocationPicker = ({ latitude, longitude, onChange, className = '' }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (mapInstance.current) return; // init once

    const startCenter = (latitude && longitude) ? [latitude, longitude] : DEFAULT_CENTER;

    const map = L.map(mapRef.current, {
      center: startCenter,
      zoom: latitude && longitude ? 15 : 12,
      zoomControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

    // Leaflet sometimes mis-measures its container if it's inside a modal
    // that just became visible — nudge it once mounted.
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if latitude/longitude change from outside (e.g. editing a different company)
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

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 p-2 sm:p-4 flex flex-col" onClick={()=>setFullscreen(false)}>
        <div className="flex justify-between items-center mb-2" onClick={e=>e.stopPropagation()}>
          <span className="text-white text-sm font-medium">Pick Location</span>
          <button onClick={()=>setFullscreen(false)} className="bg-white rounded-full px-3 py-1.5 shadow text-sm font-semibold">✕ Exit</button>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden bg-white relative" onClick={e=>e.stopPropagation()}>
          <div ref={mapRef} className="w-full h-full" />
        </div>
        <p className="text-white/80 text-xs mt-2 text-center flex items-center justify-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Click or drag pin to set location</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} className={`rounded-xl overflow-hidden ${className}`} />
      <button type="button" onClick={()=>setFullscreen(true)} className="absolute top-2 right-2 bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1 hover:bg-gray-50 z-[400]">
        <Maximize2 className="w-3.5 h-3.5" /> Full
      </button>
      <p className="flex items-center gap-1.5 text-xs text-sti-gray mt-2">
        <MapPin className="w-3.5 h-3.5" />
        Click anywhere on the map, or drag the pin, to set the exact location.
      </p>
    </div>
  );
};

export default LocationPicker;
