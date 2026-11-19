import { requireRole } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { PackagesSettings } from "@/features/settings/components/packages-settings";
export default async function PackagesSettingsPage() { await requireRole(["PARTNER"]); return <PackagesSettings packages={await db.package.findMany({ orderBy: { name: "asc" } })} />; }
