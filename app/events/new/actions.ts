"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { events, eventCategoryEnum, type EventCategory } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";

export type CreateEventState = { error?: string };

export async function createEventAction(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

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

  await db.insert(events).values({
    title,
    description,
    category: category as EventCategory,
    categorySuggestion: category === "other" ? categorySuggestion : null,
    eventDatetime,
    locationShortDesc,
    locationMapUrl,
    locationMeetupDetails,
    creatorProfileId: myBaseProfile.id,
  });

  redirect("/events");
}
