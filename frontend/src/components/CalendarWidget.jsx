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
    cells.push(<div key={`p${i}`} className="h-6 flex items-center justify-center text-xs text-gray-400">{daysInPrev - i}</div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isTodayCell = isToday(d);
    cells.push(
      <div key={d} className={`h-6 w-6 mx-auto flex items-center justify-center text-xs rounded-full cursor-pointer hover:bg-sti-blue-50 ${isTodayCell ? 'bg-sti-blue text-white font-bold' : 'text-sti-gray-dark dark:text-white'}`}>
        {d}
      </div>
    );
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(<div key={`n${i}`} className="h-6 flex items-center justify-center text-xs text-gray-400">{i}</div>);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sti-blue" />
          <h3 className="font-bold text-xs text-sti-gray-dark dark:text-white">{monthNames[month]} {year}</h3>
        </div>
        <div className="flex gap-0.5">
          <button onClick={prev} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10"><ChevronLeft className="w-3 h-3" /></button>
          <button onClick={next} className="p-1 rounded hover:bg-sti-gray-light dark:hover:bg-white/10"><ChevronRight className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekdays.map(w => <div key={w} className="text-[10px] font-semibold text-sti-gray py-0.5">{w}</div>)}
        {cells.slice(0, 35).map((cell, i) => (
          <div key={i} className="flex items-center justify-center">
            {cell}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px]">
        <span className="text-sti-gray truncate">{today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-sti-blue"></span>
      </div>
    </div>
  );
};

export default CalendarWidget;
