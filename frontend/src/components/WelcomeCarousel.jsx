import { Clock, FileCheck, Building2, Info } from 'lucide-react';
import Card from './Card';

// Clean, professional About SIMES section for dashboards (no external images)
const WelcomeCarousel = () => {
  return (
    <Card className="border border-black/5 dark:border-white/10 shadow-card bg-gradient-to-br from-white via-white to-sti-blue-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80">
      <div className="flex flex-col gap-4">
        {/* Header and overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sti-blue/10 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-sti-blue" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-sti-gray-dark dark:text-white leading-tight">
                About SIMES
              </h2>
              <p className="text-xs text-sti-gray">
                Student Internship Monitoring and Evaluation System • STI College Sta. Maria
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sti-blue-50 text-sti-blue dark:bg-sti-blue/20 dark:text-sky-300">
            Official Internship Portal
          </span>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-sti-gray leading-relaxed">
          SIMES is the centralized platform designed to manage and monitor on-the-job training (OJT) for students at STI College Sta. Maria. It provides accurate attendance logging, requirement tracking, weekly journal submissions, and real-time coordination between students, company supervisors, and OJT coordinators.
        </p>

        {/* 3 Key highlights without images */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-sti-gray-light/60 dark:bg-slate-700/40 border border-black/5 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sti-blue/10 dark:bg-sti-blue/20 flex items-center justify-center text-sti-blue">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-sti-gray-dark dark:text-white">Daily Attendance</h3>
            </div>
            <p className="text-[11px] text-sti-gray leading-normal">
              Accurate daily time recording and automatic computation of rendered internship hours.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sti-gray-light/60 dark:bg-slate-700/40 border border-black/5 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-sti-gray-dark dark:text-white">Requirements</h3>
            </div>
            <p className="text-[11px] text-sti-gray leading-normal">
              Digital submission and structured review of internship documents, endorsements, and weekly journals.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sti-gray-light/60 dark:bg-slate-700/40 border border-black/5 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-sti-gray-dark dark:text-white">Partner Companies</h3>
            </div>
            <p className="text-[11px] text-sti-gray leading-normal">
              Seamless coordination and evaluation between academic coordinators and industry supervisors.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WelcomeCarousel;
