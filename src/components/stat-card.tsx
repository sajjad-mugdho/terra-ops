import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = { label: string; value: ReactNode; icon: LucideIcon; hint?: ReactNode; danger?: boolean };

// One headline number with what it means underneath.
export function StatCard({ label, value, icon: Icon, hint, danger = false }: Props) {
  return (
    <Card size="sm" className={cn("h-full", danger && "bg-destructive/5 ring-destructive/40")}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className={cn("text-2xl leading-tight font-semibold", danger && "text-destructive")}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// Change against the period before. Never color alone: the arrow and the sign say the same.
export function Delta({ percent, against }: { percent: number | null; against: string }) {
  if (percent === null) return <>Nothing in {against} to compare</>;
  const up = percent >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-success" : "text-destructive")}>
        <Icon className="size-3.5" aria-hidden />
        {up ? "+" : "−"}
        {Math.abs(percent).toFixed(1)}%
      </span>
      vs {against}
    </span>
  );
}
