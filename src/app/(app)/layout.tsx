import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppNav } from "@/components/app-nav";
import { navItems } from "@/lib/nav-items";
import { requireUser } from "@/lib/auth-guards";
import { can, type Role } from "@/lib/permissions";
import { AgentWidget } from "@/features/ai-agent/components/agent-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const role = user.role as Role;
  const allowedItems = navItems.filter((item) => !item.resource || can(role, item.resource));
  return (
    <SidebarProvider>
      <AppNav name={user.name} role={role} allowedItems={allowedItems} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger />
          <span className="font-semibold">Junabooth CRM</span>
        </header>
        <div className="p-4 pb-24 sm:p-6 sm:pb-6">{children}</div>
      </SidebarInset>
      {/* AI Agent floating widget — available on every page */}
      <AgentWidget />
    </SidebarProvider>
  );
}
