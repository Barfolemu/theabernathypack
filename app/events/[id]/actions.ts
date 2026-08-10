"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getEvent,
  listEventMessages,
  postEventMessage,
  revokeRsvp,
  setRsvp,
  type EventMessageWithSender,
} from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";

async function requireBaseProfile(eventId: string) {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const event = await getEvent(eventId);
  if (!event) redirect("/events");

  return { myBaseProfile, event };
}

export async function rsvpGoingAction(eventId: string) {
  const { myBaseProfile } = await requireBaseProfile(eventId);
  await setRsvp(eventId, myBaseProfile.id, "going");
  redirect(`/events/${eventId}`);
}

export async function rsvpInterestedAction(eventId: string) {
  const { myBaseProfile } = await requireBaseProfile(eventId);
  await setRsvp(eventId, myBaseProfile.id, "interested");
  redirect(`/events/${eventId}`);
}

export async function revokeRsvpAction(eventId: string) {
  const { myBaseProfile } = await requireBaseProfile(eventId);
  await revokeRsvp(eventId, myBaseProfile.id);
  redirect(`/events/${eventId}`);
}

export type PostMessageState = { error?: string };

export async function postMessageAction(
  eventId: string,
  _prevState: PostMessageState,
  formData: FormData,
): Promise<PostMessageState> {
  const { myBaseProfile } = await requireBaseProfile(eventId);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Enter a message." };

  await postEventMessage(eventId, myBaseProfile.id, body);
  return {};
}

export async function getMessagesAction(eventId: string): Promise<EventMessageWithSender[]> {
  const login = await getSession();
  if (!login) return [];
  return listEventMessages(eventId);
}
