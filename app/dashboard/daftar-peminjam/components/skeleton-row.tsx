export default function SkeletonRow() {
  return (
    <div className="animate-pulse px-5 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center">
      <div className="md:col-span-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-2/3 rounded bg-blue-100" />
          <div className="h-2.5 w-1/3 rounded bg-blue-50" />
        </div>
      </div>
      <div className="md:col-span-4 h-3 w-3/4 rounded bg-blue-100" />
      <div className="md:col-span-3 md:flex md:justify-end">
        <div className="h-6 w-28 rounded-md bg-blue-100" />
      </div>
    </div>
  );
}