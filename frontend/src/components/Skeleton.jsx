export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-black/5 dark:bg-white/10 rounded-lg ${className}`} />
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="w-full space-y-3 p-4">
    <div className="flex gap-4 pb-2 border-b border-black/5 dark:border-white/10">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 py-2 border-b border-black/5 dark:border-white/5 last:border-0 items-center">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/3' : 'flex-1'}`} />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 space-y-3 shadow-card">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    ))}
  </div>
);

export default Skeleton;
