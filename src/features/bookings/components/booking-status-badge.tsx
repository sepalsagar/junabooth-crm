import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/generated/prisma/client";

const statusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  OPTION: {
    label: "Option",
    className: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-100",
  },
  POSTPONED: {
    label: "Postponed",
    className: "bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-100",
  },
};

export function BookingStatusBadge({ status }: { status: BookingStatus | string }) {
  const config =
    statusConfig[status as BookingStatus] ?? {
      label: status,
      className: "bg-muted text-muted-foreground",
    };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
