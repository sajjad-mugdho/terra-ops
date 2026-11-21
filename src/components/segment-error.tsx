"use client";

import { Button } from "@/components/ui/button";

export function SegmentError({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        The page could not be loaded. Nothing was changed. Please try again.
      </p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
