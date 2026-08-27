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
      <div className="fixed inset-0 z-[60] bg-black/80 p-2 sm:p-4 flex flex-col" onClick={()=>setFullscreen(false)}>
        <div className="flex justify-between items-center mb-2" onClick={e=>e.stopPropagation()}>
          <span className="text-white text-sm font-medium">Company Location</span>
          <button onClick={()=>setFullscreen(false)} className="bg-white hover:bg-gray-100 rounded-full p-2.5 shadow-lg flex items-center gap-1.5 text-sm font-semibold">
            ✕ Exit
          </button>
        </div>
        <div className="flex-1 rounded-xl overflow-hidden bg-white" onClick={e=>e.stopPropagation()}>
          <iframe
            title="Company location fullscreen"
            src={src}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border-0 ${className} relative`}>
      {frame}
      <button
        onClick={()=>setFullscreen(true)}
        className="absolute top-2 right-2 bg-white dark:bg-slate-800 border border-black/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow flex items-center gap-1.5 hover:bg-sti-gray-light z-10"
      >
        ⛶ Full screen
      </button>
    </div>
  );
};

export default MapEmbed;
