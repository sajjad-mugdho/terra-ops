"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { startPolling } from "@/lib/polling";

// D24: live pages ask the server again every 10 seconds.
const REFRESH_MS = 10_000;

// updatedAt is the server's time of this render, so it only moves when new data arrived.
export function AutoRefresh({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();

  useEffect(() => startPolling(() => router.refresh(), REFRESH_MS, document), [router]);

  return (
    <p className="mb-4 text-xs text-muted-foreground tabular-nums">
      Updates by itself every 10 seconds. Updated {updatedAt}
    </p>
  );
}
