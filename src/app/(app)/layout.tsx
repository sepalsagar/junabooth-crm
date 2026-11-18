import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppNav } from "@/components/app-nav";
import { navItems } from "@/lib/nav-items";
import { requireUser } from "@/lib/auth-guards";
import { can, type Role } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const role = user.role as Role;
  const allowedItems = navItems.filter((item) => !item.resource || can(role, item.resource));
  return <SidebarProvider><AppNav name={user.name} role={role} allowedItems={allowedItems} /><SidebarInset><header className="flex h-14 items-center gap-3 border-b bg-card px-4"><SidebarTrigger /><span className="font-semibold">Junabooth CRM</span></header><div className="p-6">{children}</div></SidebarInset></SidebarProvider>;
}
