import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/profiles", () => ({
  getMyBaseProfile: vi.fn(),
}));

vi.mock("@/lib/relationships", () => ({
  createRelationshipEdge: vi.fn(),
  removeRelationshipEdge: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";
import { createRelationshipEdge, removeRelationshipEdge } from "@/lib/relationships";
import { createLinkAction, removeLinkAction } from "./actions";

const myBaseProfile = { id: "base-1" };

function linkFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createLinkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ id: "login-1" } as never);
    vi.mocked(getMyBaseProfile).mockResolvedValue(myBaseProfile as never);
  });

  it("returns 'Choose a category.' and does not insert when category is missing", async () => {
    const result = await createLinkAction(
      {},
      linkFormData({ sourceProfileId: "base-1", targetProfileId: "target-1" }),
    );
    expect(result).toEqual({ error: "Choose a category." });
    expect(createRelationshipEdge).not.toHaveBeenCalled();
  });

  it("returns 'Choose a category.' and does not insert when category is not a valid enum value", async () => {
    const result = await createLinkAction(
      {},
      linkFormData({
        sourceProfileId: "base-1",
        targetProfileId: "target-1",
        category: "roommate",
      }),
    );
    expect(result).toEqual({ error: "Choose a category." });
    expect(createRelationshipEdge).not.toHaveBeenCalled();
  });

  it("surfaces the permission error when canManageEdge would be false", async () => {
    vi.mocked(createRelationshipEdge).mockResolvedValue({
      error: "You don't have permission to create that link.",
    });

    const result = await createLinkAction(
      {},
      linkFormData({ sourceProfileId: "base-1", targetProfileId: "target-1", category: "partner" }),
    );

    expect(result).toEqual({ error: "You don't have permission to create that link." });
  });

  it("surfaces the duplicate-edge error on either direction (A,B) or (B,A) - proves canonical-pair dedup holds through this action", async () => {
    vi.mocked(createRelationshipEdge).mockResolvedValue({
      error: "That relationship already exists.",
    });

    const result = await createLinkAction(
      {},
      linkFormData({ sourceProfileId: "target-1", targetProfileId: "base-1", category: "partner" }),
    );

    expect(result).toEqual({ error: "That relationship already exists." });
  });

  it("redirects back to the link workspace for the source profile on success", async () => {
    vi.mocked(createRelationshipEdge).mockResolvedValue({});

    await expect(
      createLinkAction(
        {},
        linkFormData({ sourceProfileId: "base-1", targetProfileId: "target-1", category: "partner" }),
      ),
    ).rejects.toThrow("REDIRECT:/profiles/link?for=base-1");
  });
});

describe("removeLinkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ id: "login-1" } as never);
    vi.mocked(getMyBaseProfile).mockResolvedValue(myBaseProfile as never);
  });

  it("returns an error when canManageEdge would be false", async () => {
    vi.mocked(removeRelationshipEdge).mockResolvedValue({
      error: "You don't have permission to remove that link.",
    });

    const result = await removeLinkAction(
      {},
      linkFormData({ sourceProfileId: "base-1", relationshipId: "rel-1" }),
    );

    expect(result).toEqual({ error: "You don't have permission to remove that link." });
  });

  it("redirects back to the link workspace for the source profile on success", async () => {
    vi.mocked(removeRelationshipEdge).mockResolvedValue({});

    await expect(
      removeLinkAction({}, linkFormData({ sourceProfileId: "base-1", relationshipId: "rel-1" })),
    ).rejects.toThrow("REDIRECT:/profiles/link?for=base-1");
  });
});
