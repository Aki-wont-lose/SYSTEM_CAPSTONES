import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';

// Fix default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Interactive map with zoom in/out + toggle zoom (All vs Focused) for FindCompany.
// Uses Leaflet + OSM when lat/lng exist, falls back to Google iframe for address-only.
const MapEmbed = ({ latitude, longitude, address, className = '', allMarkers = null }) => {
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!hasCoords || !mapRef.current) return;
    if (mapInstance.current) {
      // On selected change, keep current zoom unless toggling wide
      const targetZoom = wide ? 12 : 15;
      mapInstance.current.setView([latitude, longitude], targetZoom);
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) layer.setLatLng([latitude, longitude]);
      });
      // If allMarkers provided and wide mode, fit bounds to show all
      if (wide && allMarkers && allMarkers.length > 1) {
        const bounds = L.latLngBounds(allMarkers.map(m => [m.latitude, m.longitude]).filter(p => p[0] && p[1]));
        if (bounds.isValid()) mapInstance.current.fitBounds(bounds.pad(0.2));
      }
      setTimeout(() => mapInstance.current.invalidateSize(), 100);
      return;
    }
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: wide ? 12 : 15,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      dragging: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([latitude, longitude]).addTo(map);
    if (wide && allMarkers && allMarkers.length > 1) {
      const bounds = L.latLngBounds(allMarkers.map(m => [m.latitude, m.longitude]).filter(p => p[0] && p[1]));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
    }
    // Ensure proper size inside flex/grid
    setTimeout(() => map.invalidateSize(), 150);
    mapInstance.current = map;
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude, hasCoords, wide, allMarkers]);

  const toggleZoom = () => {
    if (!mapInstance.current) return;
    const newWide = !wide;
    setWide(newWide);
    if (newWide && allMarkers && allMarkers.length > 1) {
      const bounds = L.latLngBounds(allMarkers.map(m => [m.latitude, m.longitude]).filter(p => p[0] && p[1]));
      if (bounds.isValid()) mapInstance.current.fitBounds(bounds.pad(0.2));
    } else {
      mapInstance.current.setView([latitude, longitude], newWide ? 12 : 16);
    }
  };

  // No coords: fallback to Google iframe for address search
  if (!hasCoords) {
    if (!address) {
      return (
        <div className={`flex items-center justify-center bg-sti-gray-light dark:bg-slate-700 text-sti-gray text-sm rounded-xl ${className}`}>
          No location set yet
        </div>
      );
    }
    const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    return (
      <iframe
        title="Company location"
        src={src}
        className={`rounded-xl border-0 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border-0 ${className} relative`}>
      <div ref={mapRef} className="w-full h-full min-h-[18rem]" />
      <button
        onClick={toggleZoom}
        className="absolute top-2 right-2 z-[400] bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sti-gray-dark dark:text-white shadow flex items-center gap-1.5 hover:bg-sti-gray-light dark:hover:bg-white/10"
        title={wide ? 'Zoom to focused pin' : 'Zoom to show all area'}
      >
        {wide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        {wide ? 'Focused' : 'All view'}
      </button>
      <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-800/90 text-[10px] px-2 py-1 rounded-full shadow pointer-events-none">
        +/- to zoom • Pinch or drag
      </div>
    </div>
  );
};

export default MapEmbed;
