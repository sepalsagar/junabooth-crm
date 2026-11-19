import { requireRole } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { UserSettings } from "@/features/settings/components/user-settings";

export default async function UsersSettingsPage() {
  await requireRole(["PARTNER"]);
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, disabled: true } });
  return <UserSettings users={users} />;
}
