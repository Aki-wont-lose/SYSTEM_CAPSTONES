import { useEffect, useState } from 'react';
import { Clock, Save, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getOjtHours, updateOjtHours } from '../services/ojtHoursService';
import { courseLabel } from '../constants/programs';

// Admin-only page for the required OJT hours applied to each course.
const OjtHours = () => {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getOjtHours()
      .then((res) => setHours(res.data || []))
      .catch((err) =>
        setToast({ tone: 'error', msg: err.response?.data?.message || 'Could not load OJT hours' })
      )
      .finally(() => setLoading(false));
  }, []);

  // Save every course's required hours in one go.
  const handleSave = async () => {
    setToast(null);
    for (const row of hours) {
      const val = Number(row.requiredHours);
      if (!Number.isInteger(val) || val < 1 || val > 2000) {
        setToast({ tone: 'error', msg: `Required hours for ${row.course} must be a whole number between 1 and 2000.` });
        return;
      }
    }
    setSaving(true);
    try {
      await Promise.all(hours.map((row) => updateOjtHours(row.course, Number(row.requiredHours))));
      setToast({ tone: 'success', msg: 'OJT hours saved' });
    } catch (err) {
      setToast({ tone: 'error', msg: err.response?.data?.message || 'Could not save OJT hours' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-sti-blue" /> OJT Required Hours
        </h1>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hours.map((row) => (
                <div key={row.course}>
                  <label className="block text-xs font-medium text-sti-gray mb-1.5">{courseLabel(row.course)}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      step="1"
                      value={row.requiredHours}
                      onChange={(e) => setHours((list) => list.map((item) => item.course === row.course ? { ...item, requiredHours: e.target.value.replace(/[^\d]/g, '') } : item))}
                      className="input-field"
                    />
                    <span className="text-xs text-sti-gray shrink-0">hours</span>
                  </div>
                </div>
              ))}
            </div>
            {hours.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 rounded-xl">
                <AlertTriangle className="w-4 h-4" /> No course hours found.
              </div>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={handleSave} loading={saving} icon={Save} disabled={!hours.length} className="text-sm px-4 py-2">
                Save hours
              </Button>
              {toast && <p className={`text-xs ${toast.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{toast.msg}</p>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default OjtHours;
