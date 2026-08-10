"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invites, profiles, type Profile } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendInviteEmail } from "@/lib/email";
import { canControlProfile, getMyBaseProfile } from "@/lib/profiles";

export type SendInviteState = { error?: string; success?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireInvitableProfile(profileId: string): Promise<Profile> {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const [target] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (
    !target ||
    !canControlProfile(myBaseProfile, target) ||
    target.profileType !== "human" ||
    target.loginId !== null
  ) {
    redirect("/profiles");
  }

  return target;
}

export async function sendInviteAction(
  profileId: string,
  _prevState: SendInviteState,
  formData: FormData,
): Promise<SendInviteState> {
  const target = await requireInvitableProfile(profileId);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const [invite] = await db
    .insert(invites)
    .values({ profileId: target.id, email })
    .returning({ id: invites.id });

  await sendInviteEmail(email, invite.id, target.displayName);

  return { success: true };
}
