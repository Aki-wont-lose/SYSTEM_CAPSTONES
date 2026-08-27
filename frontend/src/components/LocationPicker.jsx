import { useState } from 'react';
import { MapPin, Maximize2, Search } from 'lucide-react';

// Pure Google Maps - same as student FindCompany MapEmbed, no Leaflet
// Admin types address or searches, map shows it, lat/lng set via geocoding for faster
const LocationPicker = ({ latitude, longitude, onChange, className = '' }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const query = hasCoords ? `${latitude},${longitude}` : 'Sta Maria Bulacan';
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${hasCoords ? 15 : 12}&output=embed`;

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&countrycodes=ph&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        onChange(lat, lon);
      } else {
        alert('Location not found. Try "SM Baliwag, Bulacan"');
      }
    } catch { alert('Search failed'); } finally { setSearching(false); }
  };

  const frame = (
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
        <div className="flex flex-col gap-2 mb-2 shrink-0" onClick={e=>e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <span className="text-white text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Pick location</span>
            <button onClick={()=>setFullscreen(false)} className="bg-white hover:bg-gray-100 rounded-full px-4 py-2 shadow text-sm font-semibold">✕ Exit</button>
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSearch()} placeholder="Search address e.g. Sta Maria Bulacan" className="flex-1 px-3 py-2 rounded-lg text-sm" />
            <button onClick={handleSearch} disabled={searching} className="bg-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100">{searching ? '...' : 'Search'}</button>
          </div>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden bg-white" onClick={e=>e.stopPropagation()}>
          {frame}
        </div>
        <p className="text-white/80 text-xs mt-2 text-center">Search above, map will update - coordinates set automatically</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`rounded-xl overflow-hidden border border-black/5 relative ${className} h-52`}>
        {frame}
        <button type="button" onClick={()=>setFullscreen(true)} className="absolute top-2 right-2 bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1 hover:bg-gray-50 z-10">
          <Maximize2 className="w-3.5 h-3.5" /> Full
        </button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSearch()} placeholder="Search address to pinpoint" className="input-field pl-9 text-sm" />
        </div>
        <button type="button" onClick={handleSearch} disabled={searching} className="px-4 py-2 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark">{searching ? '...' : 'Search'}</button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-sti-gray">
        <MapPin className="w-3.5 h-3.5" />
        Search address above - map updates to new Google Map
      </p>
    </div>
  );
};

export default LocationPicker;
