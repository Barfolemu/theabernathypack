"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { events, eventCategoryEnum, type Event, type EventCategory } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canDeleteEvent, canEditEvent } from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";

export type EditEventState = { error?: string };

async function loadEvent(eventId: string): Promise<Event> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) redirect("/events");
  return event;
}

export async function updateEventAction(
  eventId: string,
  _prevState: EditEventState,
  formData: FormData,
): Promise<EditEventState> {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const event = await loadEvent(eventId);
  if (!canEditEvent(myBaseProfile.id, event)) redirect("/events");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const categorySuggestion = String(formData.get("categorySuggestion") ?? "").trim() || null;
  const eventDatetimeRaw = String(formData.get("eventDatetime") ?? "");
  const locationShortDesc = String(formData.get("locationShortDesc") ?? "").trim() || null;
  const locationMapUrl = String(formData.get("locationMapUrl") ?? "").trim() || null;
  const locationMeetupDetails =
    String(formData.get("locationMeetupDetails") ?? "").trim() || null;

  if (!title) return { error: "Enter a title." };
  if (!description) return { error: "Enter a description." };
  if (!eventCategoryEnum.enumValues.includes(category as EventCategory)) {
    return { error: "Choose a category." };
  }
  const eventDatetime = new Date(eventDatetimeRaw);
  if (Number.isNaN(eventDatetime.getTime())) {
    return { error: "Choose a valid date and time." };
  }
  if (!locationShortDesc && !locationMapUrl && !locationMeetupDetails) {
    return { error: "Enter at least one location detail." };
  }

  await db
    .update(events)
    .set({
      title,
      description,
      category: category as EventCategory,
      categorySuggestion: category === "other" ? categorySuggestion : null,
      eventDatetime,
      locationShortDesc,
      locationMapUrl,
      locationMeetupDetails,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  redirect("/events");
}

export async function deleteEventAction(eventId: string) {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const event = await loadEvent(eventId);
  if (!canDeleteEvent(myBaseProfile.id, login.role === "admin", event)) redirect("/events");

  await db.delete(events).where(eq(events.id, eventId));
  redirect("/events");
}
