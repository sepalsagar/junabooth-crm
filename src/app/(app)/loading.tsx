export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Top indeterminate animated progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted overflow-hidden">
        <div className="h-full bg-primary animate-[indeterminate_1.2s_ease-in-out_infinite]" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/40 animate-pulse" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
      </div>

      <div className="h-72 rounded-lg border bg-card/60 p-4 animate-pulse" />
    </div>
  );
}
