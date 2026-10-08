export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28" aria-busy="true">
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-blue-100" />
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-blue-900/5">
        <div className="h-64 animate-pulse bg-blue-50 sm:h-80" />
        <div className="space-y-4 px-5 py-8 sm:px-10 sm:py-10">
          <div className="h-5 w-20 animate-pulse rounded bg-blue-100" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="flex items-center gap-3 border-y border-blue-100 py-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-blue-100" />
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            {[100, 95, 100, 90, 60].map((w, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}