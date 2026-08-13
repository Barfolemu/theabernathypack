import "server-only";
import { and, ilike, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";

// External search is Base Profiles only (login_id set) - searching another
// user's dog or kid profile makes no sense for "link my account to a person."
export async function searchBaseProfiles(query: string, excludeProfileId: string): Promise<Profile[]> {
  if (query.trim().length === 0) return [];
  return db
    .select()
    .from(profiles)
    .where(
      and(
        isNotNull(profiles.loginId),
        ne(profiles.id, excludeProfileId),
        ilike(profiles.displayName, `%${query.trim()}%`),
      ),
    )
    .limit(10);
}
