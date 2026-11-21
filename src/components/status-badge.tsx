import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-foreground",
  info: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  danger: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
      )}
    >
      {label}
    </span>
  );
}
