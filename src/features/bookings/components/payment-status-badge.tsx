import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/calc";

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  AWAITING_ADVANCE: {
    label: "Awaiting Advance",
    className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
  },
  ADVANCE_PAID: {
    label: "Advance Paid",
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  FULLY_PAID: {
    label: "Fully Paid",
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50",
  },
  OVERPAID: {
    label: "Overpaid",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
  },
  PAY_ON_EVENT: {
    label: "Pay on Event",
    className: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50",
  },
};

export function PaymentStatusBadge({
  status,
  payOnEvent,
}: {
  status: PaymentStatus;
  payOnEvent?: boolean;
}) {
  const effectiveStatus: PaymentStatus =
    payOnEvent && status === "AWAITING_ADVANCE" ? "PAY_ON_EVENT" : status;

  const config =
    paymentStatusConfig[effectiveStatus] ?? {
      label: effectiveStatus,
      className: "bg-muted text-muted-foreground",
    };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
