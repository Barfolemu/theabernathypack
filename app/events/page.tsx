import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eventCategoryLabels } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canEditEvent, canDeleteEvent, listUpcomingEvents } from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";

export default async function EventsPage() {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const isAdmin = login.role === "admin";
  const upcomingEvents = await listUpcomingEvents();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events</h1>
        <Button nativeButton={false} render={<Link href="/events/new" />}>New event</Button>
      </div>

      {upcomingEvents.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No upcoming events yet.
        </p>
      )}

      {upcomingEvents.map((event) => {
        const canManage =
          canEditEvent(myBaseProfile.id, event) || canDeleteEvent(myBaseProfile.id, isAdmin, event);
        return (
          <Card key={event.id}>
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
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm">{event.description}</p>
              {event.locationShortDesc && (
                <p className="text-sm text-muted-foreground">{event.locationShortDesc}</p>
              )}
              {canManage && (
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
        );
      })}
    </div>
  );
}
