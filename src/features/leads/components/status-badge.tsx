import { Badge } from "@/components/ui/badge";
import type { LeadStatusType } from "../schema";

const statusConfig: Record<
  LeadStatusType,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  CONTACTED: {
    label: "Contacted",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
  },
  QUOTED: {
    label: "Quoted",
    className: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50",
  },
  FOLLOW_UP: {
    label: "Follow Up",
    className:
      "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-50",
  },
  WON: {
    label: "Won",
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50",
  },
  LOST: {
    label: "Lost",
    className: "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-100",
  },
  POSTPONED: {
    label: "Postponed",
    className: "bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-100",
  },
};

export function StatusBadge({ status }: { status: LeadStatusType | string }) {
  const config =
    statusConfig[status as LeadStatusType] ?? {
      label: status,
      className: "bg-muted text-muted-foreground",
    };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
