import { useEffect, useState } from 'react';
import { CalendarDays, Building2, User, Phone, Mail, Clock, MapPin, Pencil, History, Check, X } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMyProfile, updateMySchedule, getMyScheduleLogs } from '../services/studentService';

const DAYS_LIST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-black/5 dark:border-white/10 last:border-0">
    <div className="w-9 h-9 rounded-lg bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-sti-blue" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-sti-gray">{label}</p>
      <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 break-words">{value || 'Not yet set'}</p>
    </div>
  </div>
);

const Schedule = () => {
  const [student, setStudent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [workingHours, setWorkingHours] = useState('8:00 AM - 5:00 PM');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    try {
      const [profileRes, logsRes] = await Promise.all([
        getMyProfile(),
        getMyScheduleLogs().catch(() => ({ data: [] }))
      ]);
      const s = profileRes.data;
      setStudent(s);
      setLogs(logsRes.data || []);
      if (s?.workingHours) setWorkingHours(s.workingHours);
      if (s?.workingDays) {
        const matched = DAYS_LIST.filter((d) => s.workingDays.toLowerCase().includes(d.toLowerCase()));
        if (matched.length > 0) setSelectedDays(matched);
        else if (s.workingDays.toLowerCase().includes('monday - friday')) setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setError('Please select at least one working day.');
      return;
    }
    if (!String(workingHours || '').trim()) {
      setError('Working hours are required.');
      return;
    }
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const orderedDays = DAYS_LIST.filter((d) => selectedDays.includes(d));
      const daysLabel = orderedDays.join(', ');
      await updateMySchedule({
        workingDays: daysLabel,
        workingHours: workingHours.trim(),
        reason: reason.trim() || undefined
      });
      setEditing(false);
      setReason('');
      setNotice('Your internship schedule has been updated.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Schedule</h1>
          <p className="text-sm text-sti-gray">Create and manage your own internship working days and hours.</p>
        </div>
        {!editing && (
          <Button variant="primary" icon={Pencil} onClick={() => { setEditing(true); setError(''); setNotice(''); }}>
            {student?.workingDays ? 'Edit Schedule' : 'Create Schedule'}
          </Button>
        )}
      </div>

      {notice && (
        <div className="flex items-center gap-2 bg-sti-blue-50 text-sti-blue text-sm px-4 py-3 rounded-xl border border-sti-blue/20">
          <Check className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}

      {editing && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-sti-gray-dark dark:text-white">
              {student?.workingDays ? 'Update Working Schedule' : 'Create Working Schedule'}
            </h2>
            <button onClick={() => setEditing(false)} className="text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-2">Working Days *</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_LIST.map((day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-sti-blue text-white shadow-sm'
                          : 'bg-sti-gray-light dark:bg-slate-700 text-sti-gray-dark dark:text-slate-300 hover:bg-black/10'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Working Hours *</label>
                <input
                  type="text"
                  required
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="e.g. 8:00 AM - 5:00 PM"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Note / Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Updated shift with supervisor"
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>Save Schedule</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5 text-sti-blue" />
            <h3 className="font-bold text-sti-gray-dark dark:text-white">My Working Schedule</h3>
          </div>
          <div className="mt-2">
            <InfoRow icon={CalendarDays} label="Working Days" value={student?.workingDays} />
            <InfoRow icon={Clock} label="Working Hours" value={student?.workingHours} />
            <InfoRow icon={User} label="Supervisor" value={student?.supervisorName || student?.company?.contactPerson} />
            <InfoRow icon={Phone} label="Supervisor Contact" value={student?.supervisorContact || student?.company?.contactNumber} />
            <InfoRow icon={Mail} label="Supervisor Email" value={student?.supervisorEmail || student?.company?.email} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-sti-blue" />
            <h3 className="font-bold text-sti-gray-dark dark:text-white">Assigned Company</h3>
          </div>
          <div className="mt-2">
            <InfoRow icon={Building2} label="Company Name" value={student?.company?.name} />
            <InfoRow icon={MapPin} label="Address" value={student?.company?.address} />
            <InfoRow icon={Phone} label="Contact Number" value={student?.company?.contactNumber} />
            <InfoRow icon={Mail} label="Email" value={student?.company?.email} />
          </div>
        </Card>
      </div>

      {/* Schedule Change History */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-sti-blue" />
          <h3 className="font-bold text-sti-gray-dark dark:text-white">Schedule Change History</h3>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-sti-gray py-4">No schedule changes recorded yet.</p>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {logs.map((entry) => (
              <div key={entry.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200">
                    {entry.newDays} · {entry.newHours}
                  </p>
                  {entry.previousDays && (
                    <p className="text-xs text-sti-gray">
                      Previous: {entry.previousDays} ({entry.previousHours})
                    </p>
                  )}
                  {entry.reason && <p className="text-xs text-sti-gray italic mt-0.5">Note: {entry.reason}</p>}
                </div>
                <span className="text-xs text-sti-gray shrink-0">
                  {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Schedule;
