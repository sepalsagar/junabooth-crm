import { describe, expect, it } from "vitest";
import { can, resources, type Role } from "./permissions";

describe("role permissions", () => {
  for (const role of ["PARTNER", "SALES", "OPERATOR"] as Role[]) {
    for (const resource of resources) {
      it(`${role} ${resource}`, () => expect(can(role, resource)).toBe(role === "PARTNER" || (role === "SALES" && ["leads", "bookings", "payments"].includes(resource))));
    }
  }
});
