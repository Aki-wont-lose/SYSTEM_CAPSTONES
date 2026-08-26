// Renders a Google Maps preview using the free, key-less "output=embed" iframe.
// Accepts either lat/lng coordinates or a free-text address to search for.
const MapEmbed = ({ latitude, longitude, address, className = '' }) => {
  const hasCoords = latitude != null && longitude != null && latitude !== '' && longitude !== '';
  const query = hasCoords ? `${latitude},${longitude}` : address;

  if (!query) {
    return (
      <div className={`flex items-center justify-center bg-sti-gray-light dark:bg-slate-700 text-sti-gray text-sm rounded-xl ${className}`}>
        No location set yet
      </div>
    );
  }

  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <iframe
      title="Company location"
      src={src}
      className={`rounded-xl border-0 ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
};

export default MapEmbed;
