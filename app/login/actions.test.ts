import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLimit, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockLimit, mockSelect };
});

vi.mock("@/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginAction } from "./actions";

function loginFormData(email: string, password: string) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([
      { id: "login-1", email: "user@example.com", passwordHash: "hash", status: "active" },
    ]);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(createSession).mockResolvedValue(undefined);
  });

  it("redirects to /events after a successful login", async () => {
    await expect(
      loginAction({}, loginFormData("user@example.com", "correct-password")),
    ).rejects.toThrow("REDIRECT:/events");

    expect(createSession).toHaveBeenCalledWith("login-1");
  });
});
