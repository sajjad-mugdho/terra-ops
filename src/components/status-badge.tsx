import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOTS = {
  neutral: "bg-muted-foreground/50",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

// The dot carries the tone, the label carries the meaning.
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof DOTS }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span className={cn("size-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden />
      {label}
    </Badge>
  );
}
