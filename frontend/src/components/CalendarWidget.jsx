import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getMySubmissions, getMyWeeklyTasks, getRequirements } from '../services/requirementService';

const toDateKey = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeRequirementDueDate = (req) => {
  if (!req) return null;
  if (req.dueDate) return new Date(req.dueDate);
  if (req.dueInDays && req.createdAt) {
    return new Date(new Date(req.createdAt).getTime() + Number(req.dueInDays) * 86400000);
  }
  return null;
};

const CalendarWidget = ({ deadlines: externalDeadlines }) => {
  const { user } = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [fetchedDeadlines, setFetchedDeadlines] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  useEffect(() => {
    if (Array.isArray(externalDeadlines)) return;
    let active = true;

    const loadDeadlines = async () => {
      try {
        if (user?.role === 'STUDENT') {
          const [subRes, taskRes] = await Promise.all([
            getMySubmissions().catch(() => ({ data: [] })),
            getMyWeeklyTasks().catch(() => ({ data: [] })),
          ]);
          if (!active) return;

          const items = [];
          for (const req of subRes?.data || []) {
            const due = computeRequirementDueDate(req);
            const isDone =
              req.derivedStatus === 'COMPLETED' ||
              req.submission?.status === 'APPROVED';
            if (due && !isDone) {
              items.push({
                id: `req-${req.id}`,
                title: req.title || 'Requirement Deadline',
                dueDate: due,
                type: 'requirement',
                status: req.derivedStatus || 'NOT_STARTED',
              });
            }
          }

          for (const task of taskRes?.data || []) {
            if (task.dueDate && task.status !== 'COMPLETED') {
              items.push({
                id: `task-${task.id}`,
                title: task.title || 'Weekly Task',
                dueDate: new Date(task.dueDate),
                type: 'task',
                status: task.status || 'PENDING',
              });
            }
          }

          setFetchedDeadlines(items);
        } else if (user?.role) {
          const reqRes = await getRequirements().catch(() => ({ data: [] }));
          if (!active) return;

          const items = [];
          for (const req of reqRes?.data || []) {
            const due = computeRequirementDueDate(req);
            if (due) {
              items.push({
                id: `req-${req.id}`,
                title: req.title || 'Requirement Deadline',
                dueDate: due,
                type: 'requirement',
                status: 'ACTIVE',
              });
            }
          }
          setFetchedDeadlines(items);
        }
      } catch {
        // Keep calendar functional even if deadline fetch fails
      }
    };

    loadDeadlines();
    return () => {
      active = false;
    };
  }, [user?.role, externalDeadlines]);

  const allDeadlines = Array.isArray(externalDeadlines) ? externalDeadlines : fetchedDeadlines;

  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const deadlinesByDate = useMemo(() => {
    const map = new Map();
    for (const item of allDeadlines) {
      const key = toDateKey(item.dueDate);
      if (!key) continue;
      const d = new Date(item.dueDate);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const isUpcoming = dayStart >= todayStart;
      const entry = map.get(key) || { items: [], hasUpcoming: false, hasOverdue: false };
      entry.items.push({ ...item, isUpcoming });
      if (isUpcoming) entry.hasUpcoming = true;
      else entry.hasOverdue = true;
      map.set(key, entry);
    }
    return map;
  }, [allDeadlines, todayStart.getTime()]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const totalCells = firstDay + daysInMonth > 35 ? 42 : 35;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prev = () => {
    setSelectedDateKey(null);
    setCurrent(new Date(year, month - 1, 1));
  };
  const next = () => {
    setSelectedDateKey(null);
    setCurrent(new Date(year, month + 1, 1));
  };
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(
      <div key={`p${i}`} className="h-7 w-7 mx-auto flex items-center justify-center text-xs text-gray-400 dark:text-slate-600 select-none">
        {daysInPrev - i}
      </div>
    );
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isTodayCell = isToday(d);
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const deadlineInfo = deadlinesByDate.get(dateKey);
    const hasUpcomingDeadline = Boolean(deadlineInfo?.hasUpcoming);
    const hasOverdueDeadline = Boolean(!hasUpcomingDeadline && deadlineInfo?.hasOverdue);
    const isSelected = selectedDateKey === dateKey;

    let cellClasses = 'text-sti-gray-dark dark:text-white hover:bg-sti-blue-50 dark:hover:bg-white/10';
    if (hasUpcomingDeadline) {
      // Visible red circular indicator around the corresponding calendar date number
      cellClasses = `bg-red-500 text-white font-bold shadow-sm hover:bg-red-600 ${
        isTodayCell ? 'ring-2 ring-sti-blue ring-offset-1 dark:ring-offset-slate-800' : 'ring-2 ring-red-500/20'
      }`;
    } else if (hasOverdueDeadline) {
      // Distinguish past/overdue deadlines while keeping the date readable
      cellClasses = 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-500/60 font-semibold hover:bg-red-200/80';
    } else if (isTodayCell) {
      cellClasses = 'bg-sti-blue text-white font-bold shadow-sm';
    }

    const tooltip = deadlineInfo
      ? deadlineInfo.items.map((it) => `${it.title} (${it.isUpcoming ? 'Upcoming due date' : 'Past due date'})`).join('\n')
      : isTodayCell
      ? 'Today'
      : undefined;

    cells.push(
      <button
        type="button"
        key={d}
        title={tooltip}
        onClick={() => {
          if (deadlineInfo) {
            setSelectedDateKey((prevKey) => (prevKey === dateKey ? null : dateKey));
          } else {
            setSelectedDateKey(null);
          }
        }}
        className={`h-7 w-7 mx-auto flex items-center justify-center text-xs leading-none rounded-full transition-colors cursor-pointer select-none ${cellClasses} ${
          isSelected ? 'ring-2 ring-sti-yellow' : ''
        }`}
      >
        {d}
      </button>
    );
  }

  const remaining = totalCells - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(
      <div key={`n${i}`} className="h-7 w-7 mx-auto flex items-center justify-center text-xs text-gray-400 dark:text-slate-600 select-none">
        {i}
      </div>
    );
  }

  const selectedDeadlines = selectedDateKey ? deadlinesByDate.get(selectedDateKey)?.items || [] : [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sti-blue shrink-0" />
          <h3 className="font-bold text-xs text-sti-gray-dark dark:text-white">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex gap-0.5">
          <button type="button" onClick={prev} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10" aria-label="Previous month">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button type="button" onClick={next} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10" aria-label="Next month">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center items-center">
        {weekdays.map((w) => (
          <div key={w} className="text-[10px] font-semibold text-sti-gray py-0.5 select-none">
            {w}
          </div>
        ))}
        {cells.slice(0, totalCells).map((cell, i) => (
          <div key={i} className="flex items-center justify-center py-0.5">
            {cell}
          </div>
        ))}
      </div>

      {selectedDeadlines.length > 0 && (
        <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
          <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">
            Deadlines on {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
          </p>
          {selectedDeadlines.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 text-[11px] text-sti-gray-dark dark:text-slate-200">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isUpcoming ? 'bg-red-500' : 'bg-red-400'}`} />
              <span className="truncate">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-sti-gray truncate">
          {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] text-sti-gray">
            <span className="w-2 h-2 rounded-full bg-sti-blue inline-block" />
            Today
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-sti-gray">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Due Date
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
