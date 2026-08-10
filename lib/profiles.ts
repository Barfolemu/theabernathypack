import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";

export async function getMyBaseProfile(loginId: string): Promise<Profile | null> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.loginId, loginId))
    .limit(1);
  return profile ?? null;
}

// Section 3.2 edit rule / 3.3.1 controller logic: a claimed profile is controlled
// by its own login; an unclaimed profile is controlled by whoever created it.
export function canControlProfile(myBaseProfile: Profile, target: Profile): boolean {
  return target.loginId === myBaseProfile.loginId || target.creatorId === myBaseProfile.id;
}
