import type { Resource } from "@/lib/permissions";

export type NavItem = { label: string; href: string; resource?: Resource };

export const navItems: NavItem[] = [
  { label: "Overview", href: "/overview" },
  { label: "All leads", href: "/leads", resource: "leads" }, { label: "New leads", href: "/leads/new", resource: "leads" }, { label: "Potential", href: "/leads/potential", resource: "leads" }, { label: "Postponed leads", href: "/leads/postponed", resource: "leads" }, { label: "Lost leads", href: "/leads/lost", resource: "leads" },
  { label: "All bookings", href: "/bookings", resource: "bookings" }, { label: "Option", href: "/bookings/option", resource: "bookings" }, { label: "Confirmed", href: "/bookings/confirmed", resource: "bookings" }, { label: "In progress", href: "/bookings/in-progress", resource: "bookings" }, { label: "Completed", href: "/bookings/completed", resource: "bookings" }, { label: "Cancelled", href: "/bookings/cancelled", resource: "bookings" },
  { label: "Calendar", href: "/calendar", resource: "bookings" },
  { label: "Due this week", href: "/collections/due-this-week", resource: "payments" }, { label: "Overdue", href: "/collections/overdue", resource: "payments" },
  { label: "Expenditure", href: "/expenditure", resource: "expenses" }, { label: "Event-day", href: "/expenditure/event-day", resource: "expenses" }, { label: "Setup", href: "/expenditure/setup", resource: "expenses" }, { label: "Operators", href: "/expenditure/operators", resource: "expenses" }, { label: "Marketing", href: "/expenditure/marketing", resource: "expenses" }, { label: "General", href: "/expenditure/general", resource: "expenses" },
  { label: "Partners and capital", href: "/partners", resource: "capital" }, { label: "Reports", href: "/reports", resource: "reports" }, { label: "Users", href: "/settings/users", resource: "settings" }, { label: "Packages", href: "/settings/packages", resource: "settings" }, { label: "Regions", href: "/settings/regions", resource: "settings" },
];
