import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockWhere, mockSelect } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockWhere, mockSelect };
});

vi.mock("@/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    isNull: vi.fn(actual.isNull),
  };
});

import { eq, isNull } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { listManagedProfiles } from "./relationships";

describe("listManagedProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the base profile first, followed by profiles it created", async () => {
    const baseProfile = { id: "base-1", loginId: "login-1" } as (typeof profiles.$inferSelect);
    const created = [{ id: "dog-1" }, { id: "kid-1" }] as (typeof profiles.$inferSelect)[];
    mockWhere.mockResolvedValue(created);

    const result = await listManagedProfiles(baseProfile);

    expect(result).toEqual([baseProfile, ...created]);
  });

  it("scopes the query to profiles created by this base profile that are still unclaimed (excludes ones since claimed via invite)", async () => {
    const baseProfile = { id: "base-1", loginId: "login-1" } as (typeof profiles.$inferSelect);
    mockWhere.mockResolvedValue([]);

    await listManagedProfiles(baseProfile);

    expect(vi.mocked(eq)).toHaveBeenCalledWith(profiles.creatorId, "base-1");
    expect(vi.mocked(isNull)).toHaveBeenCalledWith(profiles.loginId);
  });
});
