import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  eventMessages,
  eventRsvps,
  events,
  profiles,
  type Event,
  type EventRsvp,
  type Profile,
  type RsvpStatus,
} from "@/db/schema";

export async function listUpcomingEvents(): Promise<Event[]> {
  return db.select().from(events).orderBy(asc(events.eventDatetime));
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return event ?? null;
}

// Section 3.5: edit is creator-only. Delete additionally allows an admin
// (the M4/v5 admin capability), regardless of creator.
export function canEditEvent(myBaseProfileId: string, event: Event): boolean {
  return event.creatorProfileId === myBaseProfileId;
}

export function canDeleteEvent(
  myBaseProfileId: string,
  isAdmin: boolean,
  event: Event,
): boolean {
  return isAdmin || event.creatorProfileId === myBaseProfileId;
}

// Section 3.6: RSVP is restricted to Base Profiles — the app only ever reads
// or writes rows for the acting login's own base profile, never on behalf
// of a Relationship Profile it controls.
export async function getMyRsvp(eventId: string, profileId: string): Promise<EventRsvp | null> {
  const [rsvp] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.profileId, profileId)))
    .limit(1);
  return rsvp ?? null;
}

export async function getRsvpCounts(eventId: string): Promise<Record<RsvpStatus, number>> {
  const rows = await db
    .select({ status: eventRsvps.status })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId));

  const counts: Record<RsvpStatus, number> = { going: 0, interested: 0 };
  for (const row of rows) counts[row.status]++;
  return counts;
}

export async function setRsvp(
  eventId: string,
  profileId: string,
  status: RsvpStatus,
): Promise<void> {
  await db
    .insert(eventRsvps)
    .values({ eventId, profileId, status })
    .onConflictDoUpdate({
      target: [eventRsvps.eventId, eventRsvps.profileId],
      set: { status, updatedAt: new Date() },
    });
}

export async function revokeRsvp(eventId: string, profileId: string): Promise<void> {
  await db
    .delete(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.profileId, profileId)));
}

export type EventMessageWithSender = {
  id: string;
  body: string;
  createdAt: Date;
  senderProfile: Pick<Profile, "id" | "displayName">;
};

// Section 3.7: displayed in order — oldest first, like a chat log.
export async function listEventMessages(eventId: string): Promise<EventMessageWithSender[]> {
  return db
    .select({
      id: eventMessages.id,
      body: eventMessages.body,
      createdAt: eventMessages.createdAt,
      senderProfile: { id: profiles.id, displayName: profiles.displayName },
    })
    .from(eventMessages)
    .innerJoin(profiles, eq(eventMessages.profileId, profiles.id))
    .where(eq(eventMessages.eventId, eventId))
    .orderBy(asc(eventMessages.createdAt));
}

export async function postEventMessage(
  eventId: string,
  profileId: string,
  body: string,
): Promise<void> {
  await db.insert(eventMessages).values({ eventId, profileId, body });
}
