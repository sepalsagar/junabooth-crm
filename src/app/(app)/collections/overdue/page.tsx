import { requireRole } from "@/lib/auth-guards";
import { getCollectionTotals, getCollections } from "@/features/bookings/queries";
import { CollectionsView } from "@/features/bookings/components/collections-view";

export default async function OverduePage() {
  await requireRole(["PARTNER", "SALES"]);
  const [items, totals] = await Promise.all([getCollections("overdue"), getCollectionTotals()]);
  return <CollectionsView view="overdue" items={items} totals={totals} />;
}
