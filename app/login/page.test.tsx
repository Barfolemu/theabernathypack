import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { getSession } from "@/lib/auth/session";
import LoginPage from "./page";

describe("LoginPage", () => {
  it("redirects an already-authenticated visitor to /events", async () => {
    vi.mocked(getSession).mockResolvedValue({ id: "login-1" } as never);

    await expect(
      LoginPage({ searchParams: Promise.resolve({}) } as never),
    ).rejects.toThrow("REDIRECT:/events");
  });
});
