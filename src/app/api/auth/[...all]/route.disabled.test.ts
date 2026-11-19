import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler: () => ({ GET: vi.fn(), POST: mocks.post }) }));

import { POST } from "./route";

describe("disabled sign-in route", () => {
  it("rejects a disabled user with the generic credential error", async () => {
    mocks.findUnique.mockResolvedValueOnce({ disabled: true });
    const response = await POST(new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: "disabled@example.test", password: "anything" }),
      headers: { "content-type": "application/json" },
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
