import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eventCategoryLabels } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canEditEvent, getEvent, getMyRsvp, getRsvpCounts, listEventMessages } from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";
import { revokeRsvpAction, rsvpGoingAction, rsvpInterestedAction } from "./actions";
import { Chat } from "./chat";

export default async function EventDetailPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const event = await getEvent(id);
  if (!event) redirect("/events");

  const [myRsvp, counts, messages] = await Promise.all([
    getMyRsvp(event.id, myBaseProfile.id),
    getRsvpCounts(event.id),
    listEventMessages(event.id),
  ]);

  const boundGoing = rsvpGoingAction.bind(null, event.id);
  const boundInterested = rsvpInterestedAction.bind(null, event.id);
  const boundRevoke = revokeRsvpAction.bind(null, event.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
          <CardDescription>
            {eventCategoryLabels[event.category]}
            {event.category === "other" && event.categorySuggestion
              ? ` — ${event.categorySuggestion}`
              : ""}
            {" · "}
            {event.eventDatetime.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{event.description}</p>
          {event.locationShortDesc && <p className="text-sm">{event.locationShortDesc}</p>}
          {event.locationMapUrl && (
            <a
              href={event.locationMapUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline underline-offset-4"
            >
              Map link
            </a>
          )}
          {event.locationMeetupDetails && (
            <p className="text-sm text-muted-foreground">{event.locationMeetupDetails}</p>
          )}

          {canEditEvent(myBaseProfile.id, event) && (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              nativeButton={false}
              render={<Link href={`/events/${event.id}/edit`} />}
            >
              Manage
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RSVP</CardTitle>
          <CardDescription>
            {counts.going} going · {counts.interested} interested
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <form action={boundGoing}>
            <Button type="submit" variant={myRsvp?.status === "going" ? "default" : "outline"}>
              Going
            </Button>
          </form>
          <form action={boundInterested}>
            <Button
              type="submit"
              variant={myRsvp?.status === "interested" ? "default" : "outline"}
            >
              Interested
            </Button>
          </form>
          {myRsvp && (
            <form action={boundRevoke}>
              <Button type="submit" variant="ghost">
                Revoke
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <Chat eventId={event.id} initialMessages={messages} />
        </CardContent>
      </Card>
    </div>
  );
}
