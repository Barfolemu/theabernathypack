"use server";

import { redirect } from "next/navigation";
import { resolveAvatarSrc } from "@/components/profile-avatar";
import { relationshipCategoryEnum, type Profile, type RelationshipCategory } from "@/db/schema";
import { createRelationshipEdge, removeRelationshipEdge } from "@/lib/relationships";
import { searchBaseProfiles } from "@/lib/services/userSearchService";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";

export type LinkFormState = { error?: string };

export type ProfileSearchResult = Profile & { avatarSrc: string };

// Resolves each result's avatar URL server-side (the Client Component calling
// this can't render the async ProfileAvatar Server Component itself).
export async function searchUsersAction(
  excludeProfileId: string,
  query: string,
): Promise<ProfileSearchResult[]> {
  const results = await searchBaseProfiles(query, excludeProfileId);
  return Promise.all(
    results.map(async (profile) => ({ ...profile, avatarSrc: await resolveAvatarSrc(profile) })),
  );
}

export async function createLinkAction(
  _prevState: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const login = await getSession();
  if (!login) redirect("/login");
  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const sourceProfileId = String(formData.get("sourceProfileId") ?? "");
  const targetProfileId = String(formData.get("targetProfileId") ?? "");
  const category = String(formData.get("category") ?? "");

  // Validate and reject, do NOT default to a guessed category. This mirrors the
  // existing validation in app/profiles/[id]/edit/actions.ts's addRelationshipAction
  // exactly - same codebase, same rule, no new pattern introduced.
  if (!sourceProfileId || !targetProfileId) {
    return { error: "Choose a profile to link." };
  }
  if (!relationshipCategoryEnum.enumValues.includes(category as RelationshipCategory)) {
    return { error: "Choose a category." };
  }

  const result = await createRelationshipEdge(
    myBaseProfile,
    sourceProfileId,
    targetProfileId,
    category as RelationshipCategory,
  );
  if (result.error) return result;

  // This codebase does not use revalidatePath anywhere - the established pattern
  // (see app/profiles/[id]/edit/actions.ts's addRelationshipAction/
  // removeRelationshipAction) is redirect() back to the page that needs fresh
  // data, which forces a real server round-trip. Same pattern here.
  redirect(`/profiles/link?for=${sourceProfileId}`);
}

export async function removeLinkAction(
  _prevState: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const login = await getSession();
  if (!login) redirect("/login");
  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const sourceProfileId = String(formData.get("sourceProfileId") ?? "");
  const relationshipId = String(formData.get("relationshipId") ?? "");
  if (!sourceProfileId || !relationshipId) {
    return { error: "Missing profile or relationship." };
  }

  const result = await removeRelationshipEdge(myBaseProfile, relationshipId);
  if (result.error) return result;

  redirect(`/profiles/link?for=${sourceProfileId}`);
}
