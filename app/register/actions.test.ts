import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSelect, mockReturning, mockTransaction } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockTx = { insert: mockInsert };
  const mockTransaction = vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

  return { mockSelect, mockReturning, mockTransaction };
});

vi.mock("@/db", () => ({
  db: { select: mockSelect, transaction: mockTransaction },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { registerAction } from "./actions";

function registerFormData() {
  const formData = new FormData();
  formData.set("displayName", "Jamie");
  formData.set("email", "jamie@example.com");
  formData.set("password", "correct-password");
  formData.set("confirmPassword", "correct-password");
  return formData;
}

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: "login-1" }]);
    vi.mocked(hashPassword).mockResolvedValue("hashed");
    vi.mocked(createSession).mockResolvedValue(undefined);
  });

  it("redirects to /profiles after a successful registration", async () => {
    await expect(registerAction({}, registerFormData())).rejects.toThrow(
      "REDIRECT:/profiles",
    );

    expect(createSession).toHaveBeenCalledWith("login-1");
  });
});
