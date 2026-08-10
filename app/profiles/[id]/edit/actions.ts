"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invites, profiles, type Profile } from "@/db/schema";
import { getDefaultAvatarsFor } from "@/lib/avatars";
import { getSession } from "@/lib/auth/session";
import { canControlProfile, getMyBaseProfile } from "@/lib/profiles";
import { createAvatarUploadUrl, isAllowedAvatarContentType } from "@/lib/s3";

export type EditProfileState = { error?: string };

async function requireControl(profileId: string): Promise<{ myBaseProfile: Profile; target: Profile }> {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const [target] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!target || !canControlProfile(myBaseProfile, target)) redirect("/profiles");

  return { myBaseProfile, target };
}

export async function updateProfileAction(
  profileId: string,
  _prevState: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const { target } = await requireControl(profileId);

  const displayName = String(formData.get("displayName") ?? "").trim();
  const breed =
    target.profileType === "dog" ? String(formData.get("breed") ?? "").trim() || null : null;
  const defaultAvatarId = formData.get("defaultAvatarId");

  if (!displayName) {
    return { error: "Enter a name." };
  }

  const values: Partial<typeof profiles.$inferInsert> = {
    displayName,
    breed,
    updatedAt: new Date(),
  };

  if (typeof defaultAvatarId === "string" && defaultAvatarId) {
    if (!getDefaultAvatarsFor(target.profileType).some((avatar) => avatar.id === defaultAvatarId)) {
      return { error: "Choose a valid avatar." };
    }
    values.defaultAvatarId = defaultAvatarId;
    values.avatarKey = null;
  }

  await db.update(profiles).set(values).where(eq(profiles.id, profileId));
  redirect("/profiles");
}

export async function deleteProfileAction(profileId: string) {
  const { myBaseProfile, target } = await requireControl(profileId);
  if (target.id === myBaseProfile.id) {
    redirect("/profiles");
  }

  await db.transaction(async (tx) => {
    await tx.delete(invites).where(eq(invites.profileId, profileId));
    await tx.delete(profiles).where(eq(profiles.id, profileId));
  });

  redirect("/profiles");
}

export async function createAvatarUploadUrlAction(profileId: string, contentType: string) {
  await requireControl(profileId);
  if (!isAllowedAvatarContentType(contentType)) {
    throw new Error("Unsupported image type.");
  }
  return createAvatarUploadUrl(profileId, contentType);
}

export async function setProfileAvatarAction(profileId: string, key: string) {
  await requireControl(profileId);
  await db
    .update(profiles)
    .set({ avatarKey: key, defaultAvatarId: null, updatedAt: new Date() })
    .where(eq(profiles.id, profileId));
}
