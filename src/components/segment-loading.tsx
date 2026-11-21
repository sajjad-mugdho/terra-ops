export function SegmentLoading() {
  return (
    <div className="flex flex-col gap-3 py-2" role="status" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      <div className="mt-4 h-40 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
