import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { profiles, relationships, type Profile, type RelationshipCategory } from "@/db/schema";
import { canControlProfile } from "@/lib/profiles";

export type PackMember = {
  relationshipId: string;
  category: RelationshipCategory;
  profile: Profile;
};

// Section 3.3.1/3.3.2: if both profiles are Base Profiles, either accountholder may
// act unilaterally. Otherwise, the actor must control every non-base profile in the
// pair (the non-base side's controller is the only one with a say).
export function canManageEdge(actor: Profile, a: Profile, b: Profile): boolean {
  const nonBase = [a, b].filter((profile) => profile.loginId === null);
  if (nonBase.length === 0) {
    return canControlProfile(actor, a) || canControlProfile(actor, b);
  }
  return nonBase.every((profile) => canControlProfile(actor, profile));
}

export function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// Section 3.3.3: a single one-hop join, no recursion.
export async function getPack(profileId: string): Promise<PackMember[]> {
  const edges = await db
    .select()
    .from(relationships)
    .where(or(eq(relationships.profileIdA, profileId), eq(relationships.profileIdB, profileId)));

  if (edges.length === 0) return [];

  const otherIds = edges.map((edge) =>
    edge.profileIdA === profileId ? edge.profileIdB : edge.profileIdA,
  );
  const others = await db.select().from(profiles).where(inArray(profiles.id, otherIds));
  const byId = new Map(others.map((profile) => [profile.id, profile]));

  return edges.flatMap((edge) => {
    const otherId = edge.profileIdA === profileId ? edge.profileIdB : edge.profileIdA;
    const profile = byId.get(otherId);
    return profile ? [{ relationshipId: edge.id, category: edge.category, profile }] : [];
  });
}

// Profiles the given Base Profile may manage in the internal-linking workspace:
// itself, plus any non-base profile it created that hasn't since been claimed by
// someone else via invite acceptance (loginId now set = no longer theirs to manage).
export async function listManagedProfiles(baseProfile: Profile): Promise<Profile[]> {
  const created = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.creatorId, baseProfile.id), isNull(profiles.loginId)));
  return [baseProfile, ...created];
}

async function loadPair(idA: string, idB: string): Promise<[Profile, Profile] | null> {
  const rows = await db.select().from(profiles).where(inArray(profiles.id, [idA, idB]));
  const a = rows.find((profile) => profile.id === idA);
  const b = rows.find((profile) => profile.id === idB);
  return a && b ? [a, b] : null;
}

export async function createRelationshipEdge(
  actor: Profile,
  profileAId: string,
  profileBId: string,
  category: RelationshipCategory,
): Promise<{ error?: string }> {
  if (profileAId === profileBId) return { error: "Choose a different profile." };

  const pair = await loadPair(profileAId, profileBId);
  if (!pair) return { error: "Profile not found." };
  const [a, b] = pair;
  if (!canManageEdge(actor, a, b)) {
    return { error: "You don't have permission to create that link." };
  }

  const [idA, idB] = canonicalPair(a.id, b.id);
  try {
    await db.insert(relationships).values({
      profileIdA: idA,
      profileIdB: idB,
      category,
      createdByProfileId: actor.id,
    });
  } catch {
    return { error: "That relationship already exists." };
  }
  return {};
}

export async function removeRelationshipEdge(
  actor: Profile,
  relationshipId: string,
): Promise<{ error?: string }> {
  const [edge] = await db
    .select()
    .from(relationships)
    .where(eq(relationships.id, relationshipId))
    .limit(1);
  if (!edge) return { error: "Relationship not found." };

  const pair = await loadPair(edge.profileIdA, edge.profileIdB);
  if (!pair) return { error: "Profile not found." };
  const [a, b] = pair;
  if (!canManageEdge(actor, a, b)) {
    return { error: "You don't have permission to remove that link." };
  }

  await db.delete(relationships).where(eq(relationships.id, relationshipId));
  return {};
}
