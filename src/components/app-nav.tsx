"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/permissions";
import type { NavItem } from "@/lib/nav-items";

export function AppNav({ name, role, allowedItems }: { name: string; role: Role; allowedItems: NavItem[] }) {
  const pathname = usePathname(); const router = useRouter();
  return <Sidebar><SidebarContent><SidebarGroup><SidebarGroupLabel>Junabooth CRM</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{allowedItems.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton isActive={pathname === item.href} render={<Link href={item.href} />}><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter><div className="space-y-2 p-2 text-sm"><div className="font-medium">{name}</div><Badge>{role}</Badge><Button className="w-full" variant="outline" onClick={async () => { await authClient.signOut(); router.push("/login"); router.refresh(); }}>Sign out</Button></div></SidebarFooter></Sidebar>;
}
