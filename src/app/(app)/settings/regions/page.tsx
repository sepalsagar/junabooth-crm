import { requireRole } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { RegionsSettings } from "@/features/settings/components/regions-settings";
export default async function RegionsSettingsPage() { await requireRole(["PARTNER"]); return <RegionsSettings regions={await db.region.findMany({ orderBy: { name: "asc" } })} />; }
