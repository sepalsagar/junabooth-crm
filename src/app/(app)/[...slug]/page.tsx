import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { can, type Resource, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
const titles: Record<string, string> = { leads: "Leads", bookings: "Bookings", calendar: "Calendar", collections: "Collections", expenditure: "Expenditure", partners: "Partners and capital", reports: "Reports", settings: "Settings" };
export default async function PlaceholderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const resources: Record<string, Resource> = { leads: "leads", bookings: "bookings", calendar: "bookings", collections: "payments", expenditure: "expenses", partners: "capital", reports: "reports", settings: "settings" };
  const resource = resources[slug[0]];
  if (resource) {
    const { user } = await requireUser();
    if (!can(user.role as Role, resource)) redirect("/forbidden");
  }
  const title = titles[slug[0]] ?? slug.map((word) => word.replaceAll("-", " ")).join(" · ");
  return <><h1 className="text-3xl font-bold capitalize">{title}</h1><Card className="mt-6"><CardHeader><CardTitle>Nothing here yet</CardTitle></CardHeader><CardContent>This workspace is ready for the next phase.</CardContent></Card></>;
}
