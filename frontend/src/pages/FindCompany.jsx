import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Mail, Users, Search } from 'lucide-react';
import Card from '../components/Card';
import MapEmbed from '../components/MapEmbed';
import { getCompanies } from '../services/companyService';

const FindCompany = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCompanies()
      .then((res) => {
        // Only show active partner companies that still have open slots
        const available = res.data.filter((c) => c.status === 'ACTIVE' && c.availableSlots > 0);
        setCompanies(available);
        setSelected(available[0] || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industryType || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="px-1">
        <h1 className="text-lg sm:text-xl font-bold text-sti-gray-dark dark:text-white">Find a Company</h1>
        <p className="text-xs sm:text-sm text-sti-gray">Browse STI partner companies that currently have open OJT slots.</p>
      </div>

      {companies.length === 0 ? (
        <Card className="text-center py-12 sm:py-16">
          <Building2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No partner companies have open slots right now.</p>
          <p className="text-sti-gray text-xs mt-1">Check back later or ask your OJT coordinator.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Company list - on cp, show first, scrollable */}
          <div className="lg:col-span-2 space-y-3 order-2 lg:order-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or industry..."
                className="input-field pl-10 text-sm py-3"
              />
            </div>

            <div className="space-y-2 max-h-[40vh] sm:max-h-[520px] overflow-y-auto pr-1 -mr-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-colors min-h-[60px] ${
                    selected?.id === c.id
                      ? 'border-sti-blue bg-sti-blue-50 dark:bg-sti-blue/10'
                      : 'border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-sti-blue/40 active:bg-sti-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-sti-gray-dark dark:text-white truncate pr-2">{c.name}</p>
                      {c.industryType && <p className="text-xs text-sti-gray truncate">{c.industryType}</p>}
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-sti-blue bg-white dark:bg-slate-700 px-2 py-1 rounded-full border border-sti-blue/20">
                      <Users className="w-3 h-3" /> {c.availableSlots}
                    </span>
                  </div>
                  {c.address && (
                    <p className="flex items-start gap-1 text-xs text-sti-gray mt-1.5 line-clamp-2">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {c.address}
                    </p>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-sti-gray text-center py-8">No matches for "{search}".</p>
              )}
            </div>
          </div>

          {/* Map + details - on cp, map first for immediate visual */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card className="p-0 overflow-hidden">
              <MapEmbed
                latitude={selected?.latitude}
                longitude={selected?.longitude}
                address={selected?.address || selected?.name}
                allMarkers={companies}
                className="w-full h-64 sm:h-72"
              />
              {selected && (
                <div className="p-4 sm:p-5">
                  <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm sm:text-base">{selected.name}</h3>
                  {selected.industryType && <p className="text-xs text-sti-gray mb-2 sm:mb-3">{selected.industryType}</p>}
                  <div className="space-y-2 text-xs sm:text-sm">
                    {selected.address && (
                      <p className="flex items-center gap-2 text-sti-gray-dark dark:text-slate-300 break-words">
                        <MapPin className="w-4 h-4 text-sti-blue shrink-0" /> {selected.address}
                      </p>
                    )}
                    {selected.contactNumber && (
                      <p className="flex items-center gap-2 text-sti-gray-dark dark:text-slate-300">
                        <Phone className="w-4 h-4 text-sti-blue shrink-0" /> {selected.contactNumber}
                      </p>
                    )}
                    {selected.email && (
                      <p className="flex items-center gap-2 text-sti-gray-dark dark:text-slate-300 break-all">
                        <Mail className="w-4 h-4 text-sti-blue shrink-0" /> {selected.email}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-sti-gray-dark dark:text-slate-300">
                      <Users className="w-4 h-4 text-sti-blue shrink-0" /> {selected.availableSlots} slot{selected.availableSlots !== 1 ? 's' : ''} open
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindCompany;
