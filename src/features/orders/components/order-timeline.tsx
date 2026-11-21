import { formatUtc } from "@/lib/dates";
import type { TimelineEvent } from "../service";

// actorName is only in the Admiral DTO: it shows who did each step.
export type ShownEvent = TimelineEvent & { actorName?: string };

export function OrderTimeline({ events }: { events: ShownEvent[] }) {
  return (
    <ol className="flex flex-col gap-3 border-l pl-4">
      {events.map((event, index) => (
        <li key={index} className="relative text-sm">
          <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" aria-hidden />
          <p className="font-medium">{event.label}</p>
          {event.note && event.note !== event.label && (
            <p className="text-muted-foreground">{event.note}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatUtc(event.occurredAt)}
            {event.actorName && ` · ${event.actorName}`}
          </p>
        </li>
      ))}
    </ol>
  );
}
