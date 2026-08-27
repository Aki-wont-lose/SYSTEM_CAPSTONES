import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const CalendarWidget = () => {
  const [current, setCurrent] = useState(new Date());

  const year = current.getFullYear();
  const month = current.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekdays = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(<div key={`p${i}`} className="h-8 flex items-center justify-center text-xs text-gray-400">{daysInPrev - i}</div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isTodayCell = isToday(d);
    cells.push(
      <div key={d} className={`h-8 flex items-center justify-center text-xs rounded-full cursor-pointer hover:bg-sti-blue-50 ${isTodayCell ? 'bg-sti-blue text-white font-bold' : 'text-sti-gray-dark dark:text-white'}`}>
        {d}
      </div>
    );
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(<div key={`n${i}`} className="h-8 flex items-center justify-center text-xs text-gray-400">{i}</div>);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sti-blue" />
          <h3 className="font-bold text-sm text-sti-gray-dark dark:text-white">{monthNames[month]} {year}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={next} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map(w => <div key={w} className="text-[11px] font-semibold text-sti-gray py-1">{w}</div>)}
        {cells.slice(0, 35)}
      </div>
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs">
        <span className="text-sti-gray">Today: {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className="w-2 h-2 rounded-full bg-sti-blue"></span>
      </div>
    </div>
  );
};

export default CalendarWidget;
