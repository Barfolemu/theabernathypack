import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { events, type Event } from "@/db/schema";

export async function listUpcomingEvents(): Promise<Event[]> {
  return db.select().from(events).orderBy(asc(events.eventDatetime));
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
