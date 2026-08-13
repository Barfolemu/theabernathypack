import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    ilike: vi.fn(actual.ilike),
    isNotNull: vi.fn(actual.isNotNull),
    ne: vi.fn(actual.ne),
  };
});

import { ilike, isNotNull, ne } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { searchBaseProfiles } from "./userSearchService";

describe("searchBaseProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] without querying the database when the query is blank", async () => {
    const result = await searchBaseProfiles("   ", "self-id");
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("excludes profiles with loginId === null, excludes the searching user's own id, and matches display_name case-insensitively via ilike", async () => {
    const matches = [{ id: "other-1", displayName: "Annie" }];
    mockLimit.mockResolvedValue(matches);

    const result = await searchBaseProfiles("ann", "self-id");

    expect(vi.mocked(isNotNull)).toHaveBeenCalledWith(profiles.loginId);
    expect(vi.mocked(ne)).toHaveBeenCalledWith(profiles.id, "self-id");
    expect(vi.mocked(ilike)).toHaveBeenCalledWith(profiles.displayName, "%ann%");
    expect(result).toEqual(matches);
  });

  it("trims surrounding whitespace before building the ilike pattern", async () => {
    mockLimit.mockResolvedValue([]);
    await searchBaseProfiles("  ann  ", "self-id");
    expect(vi.mocked(ilike)).toHaveBeenCalledWith(profiles.displayName, "%ann%");
  });
});
