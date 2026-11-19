import { requireRole } from "@/lib/auth-guards";
import { getPartnersCapitalData } from "@/features/capital/queries";
import { PartnersView } from "@/features/capital/components/partners-view";

export default async function PartnersPage() {
  // STRICT SERVER ROLE GUARD: PARTNER ONLY
  await requireRole(["PARTNER"]);

  const data = await getPartnersCapitalData();

  return <PartnersView data={data} />;
}
