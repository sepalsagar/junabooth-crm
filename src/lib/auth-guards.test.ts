import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));

import { getActiveSession, requireUser } from "./auth-guards";

describe("disabled-user session guards", () => {
  it("rejects an already-issued session for a disabled user", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "disabled-1", role: "PARTNER" } });
    mocks.findUnique.mockResolvedValueOnce({ disabled: true });
    await expect(getActiveSession(new Headers())).resolves.toBeNull();
  });

  it("redirects disabled users instead of allowing the app layout", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "disabled-1", role: "PARTNER" } });
    mocks.findUnique.mockResolvedValueOnce({ disabled: true });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns an active session for enabled users", async () => {
    const session = { user: { id: "active-1", role: "PARTNER" } };
    mocks.getSession.mockResolvedValueOnce(session);
    mocks.findUnique.mockResolvedValueOnce({ disabled: false });
    await expect(getActiveSession(new Headers())).resolves.toEqual(session);
  });
});
