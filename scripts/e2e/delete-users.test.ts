import { describe, expect, it, vi } from "vitest";
import { deleteE2eUsers, isE2eEmail } from "./delete-users";

describe("E2E deletion safety", () => {
  it("recognizes only @e2e.invalid users", () => {
    expect(isE2eEmail("sales-test@e2e.invalid")).toBe(true);
    expect(isE2eEmail("real@example.com")).toBe(false);
  });

  it("refuses deletion unless E2E=1", async () => {
    await expect(deleteE2eUsers({} as never, false)).rejects.toThrow("E2E=1 is required");
  });

  it("filters non-E2E users out before deletion", async () => {
    const client = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: "e2e-1", email: "sales@e2e.invalid" },
          { id: "real-1", email: "partner@company.test" },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      session: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      account: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    await expect(deleteE2eUsers(client as never, true)).resolves.toBe(1);
    expect(client.session.deleteMany).toHaveBeenCalledTimes(1);
    expect(client.account.deleteMany).toHaveBeenCalledTimes(1);
    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["e2e-1"] },
        email: { endsWith: "@e2e.invalid" },
      },
    });
  });
});
