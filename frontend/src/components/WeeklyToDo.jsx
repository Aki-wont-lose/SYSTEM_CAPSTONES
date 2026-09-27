import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, ListChecks, CalendarClock } from 'lucide-react';
import Card from './Card';
import { getMyWeeklyTasks, completeWeeklyTask } from '../services/requirementService';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

// Weekly to-do list for the signed-in student. Renders nothing when there is nothing
// pending, unless `emptyMessage` is given (used on the dashboard to keep the slot visible).
const WeeklyToDo = ({ emptyMessage, onChanged }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const res = await getMyWeeklyTasks();
      setTasks(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your to-do');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId) => {
    setBusyId(taskId);
    setError('');
    try {
      await completeWeeklyTask(taskId);
      await loadTasks();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the to-do');
    } finally {
      setBusyId(null);
    }
  };

  const pending = tasks.filter((t) => t.status !== 'COMPLETED');

  if (!loading && pending.length === 0 && !emptyMessage) return null;

  return (
    <Card className="!p-4 sm:!p-6">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-5 h-5 text-sti-blue shrink-0" />
        <h2 className="font-bold text-sti-gray-dark dark:text-white">Weekly To-Do</h2>
        {pending.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">{pending.length}</span>
        )}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-sti-gray py-2">Loading your to-do...</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-sti-gray">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {pending.map((task) => {
            const missed = task.derivedStatus === 'MISSING';
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${missed ? 'border-red-100 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900' : 'border-black/5 dark:border-white/10'}`}
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={busyId === task.id}
                  className="mt-0.5 p-1 rounded-lg hover:bg-sti-blue-50 text-sti-blue shrink-0 disabled:opacity-50 flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                  title="Mark as done"
                  aria-label={`Mark ${task.title} as done`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white break-words">{task.title}</p>
                  {task.description && <p className="text-xs text-sti-gray mt-0.5 break-words">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-sti-gray flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" /> <span className="break-words">Week of {formatDate(task.weekOf)}</span>
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${missed ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {missed ? 'Overdue' : `Due ${formatDate(task.dueDate)}`}
                    </span>
                  </div>
                </div>
                {task.requirement?.templateFile && (
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = task.requirement.templateFile;
                      a.download = task.requirement.templateFileName || 'template.pdf';
                      a.click();
                    }}
                    className="p-2 rounded-lg hover:bg-sti-blue-50 text-sti-blue shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                    title="Download template"
                    aria-label="Download template"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default WeeklyToDo;
