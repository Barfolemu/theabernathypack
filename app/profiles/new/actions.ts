"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getDefaultAvatarsFor } from "@/lib/avatars";
import { getSession } from "@/lib/auth/session";
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

  await db.insert(profiles).values({
    profileType,
    displayName,
    breed,
    defaultAvatarId,
    creatorId: myBaseProfile.id,
  });

  redirect("/profiles");
}
