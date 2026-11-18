export const resources = ["leads", "bookings", "payments", "expenses", "capital", "settings", "reports"] as const;
export type Resource = (typeof resources)[number];
export type Role = "PARTNER" | "SALES" | "OPERATOR";

export function can(role: Role, resource: Resource) {
  if (role === "PARTNER") return true;
  if (role === "SALES") return ["leads", "bookings", "payments"].includes(resource);
  return false;
}

export function attachExpensesForRole<T extends object, E>(
  role: Role,
  result: T,
  expenses: E[] = []
) {
  if (!can(role, "expenses")) return result;
  return { ...result, expenses };
}
