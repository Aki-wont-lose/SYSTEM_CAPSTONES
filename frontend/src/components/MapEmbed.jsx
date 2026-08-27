import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Simple Leaflet map with native +/- zoom in/out only - no All/Full toggle, no attribution text
const MapEmbed = ({ latitude, longitude, address, className = '' }) => {
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!hasCoords || !mapRef.current) return;
    if (mapInstance.current) {
      mapInstance.current.setView([latitude, longitude], mapInstance.current.getZoom());
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) layer.setLatLng([latitude, longitude]);
      });
      setTimeout(() => mapInstance.current.invalidateSize(), 100);
      return;
    }
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      dragging: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);
    L.marker([latitude, longitude]).addTo(map);
    setTimeout(() => map.invalidateSize(), 150);
    mapInstance.current = map;
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude, hasCoords]);

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
    </div>
  );
};

export default MapEmbed;
