import { useState } from 'react';
import { MapPin, Maximize2 } from 'lucide-react';

// Google Maps picker without Leaflet - uses Google Maps embed with manual lat/lng
// Fullscreen works reliably with iframe (no Leaflet invalidateSize needed)
const LocationPicker = ({ latitude, longitude, onChange, className = '' }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const query = hasCoords ? `${latitude},${longitude}` : '14.8137,120.9550';
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${hasCoords ? 15 : 12}&output=embed`;

  const handleLatChange = (e) => {
    const v = e.target.value;
    if (v === '') onChange('', longitude);
    else onChange(parseFloat(v), longitude);
  };
  const handleLngChange = (e) => {
    const v = e.target.value;
    if (v === '') onChange(latitude, '');
    else onChange(latitude, parseFloat(v));
  };

  const mapFrame = (
    <iframe
      title="Pick location"
      src={src}
      className="w-full h-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 p-2 sm:p-4 flex flex-col" onClick={()=>setFullscreen(false)}>
        <div className="flex justify-between items-center mb-2" onClick={e=>e.stopPropagation()}>
          <span className="text-white text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Pick Location</span>
          <button onClick={()=>setFullscreen(false)} className="bg-white hover:bg-gray-100 rounded-full px-4 py-2 shadow text-sm font-semibold">✕ Exit</button>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden bg-white" onClick={e=>e.stopPropagation()}>
          {mapFrame}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 mt-2 grid grid-cols-2 gap-2" onClick={e=>e.stopPropagation()}>
          <input type="number" step="0.0001" value={latitude ?? ''} onChange={handleLatChange} placeholder="Latitude" className="input-field text-sm" />
          <input type="number" step="0.0001" value={longitude ?? ''} onChange={handleLngChange} placeholder="Longitude" className="input-field text-sm" />
        </div>
        <p className="text-white/80 text-xs mt-2 text-center">Enter coordinates or click Full to view larger map</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`rounded-xl overflow-hidden border border-black/5 relative ${className} h-52`}>
        {mapFrame}
        <button type="button" onClick={()=>setFullscreen(true)} className="absolute top-2 right-2 bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1 hover:bg-gray-50 z-10">
          <Maximize2 className="w-3.5 h-3.5" /> Full
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.0001" value={latitude ?? ''} onChange={handleLatChange} placeholder="Latitude (e.g. 14.8137)" className="input-field text-sm" />
        <input type="number" step="0.0001" value={longitude ?? ''} onChange={handleLngChange} placeholder="Longitude (e.g. 120.9550)" className="input-field text-sm" />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-sti-gray">
        <MapPin className="w-3.5 h-3.5" />
        Enter lat/lng or use Full screen to view. Tip: Right-click on Google Maps to copy coordinates.
      </p>
    </div>
  );
};

export default LocationPicker;
