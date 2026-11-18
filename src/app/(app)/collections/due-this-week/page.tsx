import { requireRole } from "@/lib/auth-guards";
import { getCollectionTotals, getCollections } from "@/features/bookings/queries";
import { CollectionsView } from "@/features/bookings/components/collections-view";

export default async function DueThisWeekPage() {
  await requireRole(["PARTNER", "SALES"]);
  const [items, totals] = await Promise.all([getCollections("week"), getCollectionTotals()]);
  return <CollectionsView view="week" items={items} totals={totals} />;
}
