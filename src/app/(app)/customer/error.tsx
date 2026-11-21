"use client";

import { SegmentError } from "@/components/segment-error";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <SegmentError retry={retry} />;
}
