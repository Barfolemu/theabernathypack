"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles, relationships, humanRelationshipCategories, type RelationshipCategory } from "@/db/schema";
import { getDefaultAvatarsFor } from "@/lib/avatars";
import { getSession } from "@/lib/auth/session";
import { canonicalPair } from "@/lib/relationships";
import { getMyBaseProfile } from "@/lib/profiles";

export type CreateProfileState = { error?: string };

export async function createProfileAction(
  _prevState: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const profileType = formData.get("profileType") === "human" ? "human" : "dog";
  const displayName = String(formData.get("displayName") ?? "").trim();
  const breed =
    profileType === "dog" ? String(formData.get("breed") ?? "").trim() || null : null;
  const defaultAvatarId = String(formData.get("defaultAvatarId") ?? "");

  if (!displayName) {
    return { error: "Enter a name." };
  }
  if (!getDefaultAvatarsFor(profileType).some((avatar) => avatar.id === defaultAvatarId)) {
    return { error: "Choose an avatar." };
  }

  // The relationship category isn't a profile attribute — it describes the edge
  // back to whoever's creating this profile, so it's resolved here rather than
  // stored on the profile itself. Dogs are always "pet"; humans pick from the rest.
  let relationshipCategory: RelationshipCategory = "pet";
  if (profileType === "human") {
    const submitted = String(formData.get("relationshipCategory") ?? "");
    if (!humanRelationshipCategories.includes(submitted as (typeof humanRelationshipCategories)[number])) {
      return { error: "Choose how they're related to you." };
    }
    relationshipCategory = submitted as RelationshipCategory;
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      profileType,
      displayName,
      breed,
      defaultAvatarId,
      creatorId: myBaseProfile.id,
    })
    .returning();

  const [profileIdA, profileIdB] = canonicalPair(myBaseProfile.id, profile.id);
  await db.insert(relationships).values({
    profileIdA,
    profileIdB,
    category: relationshipCategory,
    createdByProfileId: myBaseProfile.id,
  });

  redirect("/profiles");
}
