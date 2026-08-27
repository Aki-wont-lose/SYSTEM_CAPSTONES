import { useState } from 'react';

// New Google Map with fullscreen toggle (no +/- zoom, fullscreen instead)
const MapEmbed = ({ latitude, longitude, address, className = '' }) => {
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const [fullscreen, setFullscreen] = useState(false);
  const query = hasCoords ? `${latitude},${longitude}` : address;
  const src = hasCoords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
    : address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed` : null;

  if (!query) {
    return (
      <div className={`flex items-center justify-center bg-sti-gray-light dark:bg-slate-700 text-sti-gray text-sm rounded-xl ${className}`}>
        No location set yet
      </div>
    );
  }

  const frame = (
    <iframe
      title="Company location"
      src={src}
      className={`rounded-xl border-0 w-full h-full min-h-[18rem] ${fullscreen ? 'fixed inset-0 z-50 rounded-none min-h-screen' : ''}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 p-2 flex flex-col" onClick={()=>setFullscreen(false)}>
        <div className="flex justify-end mb-2" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setFullscreen(false)} className="bg-white rounded-full p-2 shadow">✕</button>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden" onClick={e=>e.stopPropagation()}>
          {frame}
        </div>
      </div>
    );
  }

  // Fallback for no coords handled above, this is for hasCoords case with Leaflet removed - now using Google Map div
  return (
    <div className={`rounded-xl overflow-hidden border-0 ${className} relative`}>
      {frame}
      <button
        onClick={()=>setFullscreen(true)}
        className="absolute top-2 right-2 bg-white dark:bg-slate-800 border border-black/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1 hover:bg-sti-gray-light"
      >
        ⛶ Full screen
      </button>
    </div>
  );

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
