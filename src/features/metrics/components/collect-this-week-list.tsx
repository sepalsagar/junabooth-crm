import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { IndianRupeeIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";
import type { CollectionItem } from "@/features/bookings/queries";

interface CollectThisWeekListProps {
  items: CollectionItem[];
}

export function CollectThisWeekList({ items }: CollectThisWeekListProps) {
  const totalBalance = items.reduce((sum, item) => sum + item.balance, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IndianRupeeIcon className="h-4 w-4 text-emerald-600" />
            <span>Collect This Week</span>
            {items.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({inr(totalBalance)} due)
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Bookings with events this week and outstanding balances
          </CardDescription>
        </div>
        <Link href="/collections/due-this-week" className="text-xs text-primary hover:underline font-medium">
          View all &rarr;
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No collections due this week!
          </p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/bookings/${item.code}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {item.code}
                    </Link>
                    <span className="font-semibold">{item.clientName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{formatDateIST(item.eventDate)}</span>
                    {item.city && <span>• {item.city}</span>}
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      • Balance: {inr(item.balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.phone && (
                    <a
                      href={whatsappLink(item.phone, `Hi ${item.clientName}, regarding your Junabooth booking (${item.code}) for ${formatDateIST(item.eventDate)}, the balance of ${inr(item.balance)} is due.`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs"
                      >
                        <MessageSquareIcon className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </Button>
                    </a>
                  )}
                  {item.phone && (
                    <a href={telLink(item.phone)}>
                      <Button variant="outline" size="xs" className="h-7">
                        <PhoneIcon className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                  <Link href={`/bookings/${item.code}`}>
                    <Button variant="secondary" size="xs" className="h-7 text-xs">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
