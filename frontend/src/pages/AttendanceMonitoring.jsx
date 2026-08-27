import { useEffect, useState } from 'react';
import { Clock, CalendarDays, Search, Eye, Image as ImageIcon, X } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAllStudents } from '../services/studentService';
import { getStudentAttendanceForStaff, getStudentSummaryForStaff } from '../services/attendanceService';

const AttendanceMonitoring = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    getAllStudents().then(res => setStudents(res.data)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (student) => {
    setSelected(student);
    setLoadingDetail(true);
    try {
      const [attRes, sumRes] = await Promise.all([
        getStudentAttendanceForStaff(student.id, 30),
        getStudentSummaryForStaff(student.id)
      ]);
      setHistory(attRes.data || []);
      setSummary(sumRes.data?.attendance || null);
    } catch (e) { console.error(e); } finally { setLoadingDetail(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-sti-blue" /> Time In / Time Out Monitoring</h1>
        <p className="text-sm text-sti-gray">Supervisor & Admin view - monitor student DTR, hours left and daily records.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-4 border-b border-black/5 dark:border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student name..." className="input-field pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length===0 ? <p className="text-sm text-sti-gray p-4 text-center">No students found</p> : filtered.map(s => (
              <button key={s.id} onClick={()=>handleSelect(s)} className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/5 ${selected?.id===s.id?'bg-sti-blue-50 dark:bg-white/10':''}`}>
                <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{s.firstName} {s.lastName}</p>
                <p className="text-xs text-sti-gray">{s.studentId} • {s.completedHours}/{s.requiredHours}h • {Math.max(0, s.requiredHours - s.completedHours)}h left</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sti-gray text-sm p-8 text-center">Select a student to view Time In / Time Out</div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="p-4 border-b border-black/5 dark:border-white/10">
                <h3 className="font-bold text-sti-gray-dark dark:text-white">{selected.firstName} {selected.lastName} <span className="text-xs text-sti-gray">({selected.studentId})</span></h3>
                {summary && <p className="text-xs text-sti-blue mt-1">{summary.totalHours}h rendered • {summary.remainingHours}h left • {summary.presentDays} days present</p>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.length===0 ? <p className="text-sm text-sti-gray text-center py-8">No time records yet</p> : history.map(a=>(
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-sti-gray-light/50 dark:bg-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sti-gray-dark dark:text-white">{new Date(a.date).toLocaleDateString()}</p>
                      <p className="text-xs text-sti-gray flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {a.timeIn ? new Date(a.timeIn).toLocaleTimeString() : '—'} → {a.timeOut ? new Date(a.timeOut).toLocaleTimeString() : 'Not yet'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold">{a.renderedHours?.toFixed(2)}h</p>
                        <p className="text-xs text-sti-gray">{a.status}</p>
                      </div>
                      {(a.timeInPhoto || a.timeOutPhoto) && (
                        <button onClick={()=>setPhotoPreview(a)} className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border hover:bg-sti-gray-light"><ImageIcon className="w-4 h-4 text-sti-blue" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {photoPreview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setPhotoPreview(null)}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-md w-full" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm">{new Date(photoPreview.date).toLocaleDateString()}</h4>
                      <button onClick={()=>setPhotoPreview(null)} className="p-1 rounded-full hover:bg-sti-gray-light"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-sti-gray mb-1">Time In</p>
                        {photoPreview.timeInPhoto ? <img src={photoPreview.timeInPhoto} className="rounded-lg w-full aspect-square object-cover" /> : <div className="rounded-lg bg-sti-gray-light h-32 flex items-center justify-center text-xs">No photo</div>}
                      </div>
                      <div>
                        <p className="text-xs text-sti-gray mb-1">Time Out</p>
                        {photoPreview.timeOutPhoto ? <img src={photoPreview.timeOutPhoto} className="rounded-lg w-full aspect-square object-cover" /> : <div className="rounded-lg bg-sti-gray-light h-32 flex items-center justify-center text-xs">No photo</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AttendanceMonitoring;
