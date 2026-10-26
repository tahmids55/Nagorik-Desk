export default function Loading() {
  return (
    <div className="mx-auto max-w-[680px] space-y-4 px-3 py-6" role="status" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card rounded-[4px] shadow-none animate-pulse space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[3px] bg-neutral-fill" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded-[2px] bg-neutral-fill" />
              <div className="h-2.5 w-1/4 rounded-[2px] bg-neutral-fill" />
            </div>
          </div>
          <div className="h-4 w-3/4 rounded-[2px] bg-neutral-fill" />
          <div className="h-3 w-full rounded-[2px] bg-neutral-fill" />
          <div className="h-3 w-5/6 rounded-[2px] bg-neutral-fill" />
        </div>
      ))}
    </div>
  );
}
