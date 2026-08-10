import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCalendar } from "@/components/event-calendar";
import { ViewSwitcher } from "@/components/view-switcher";
import { eventCategoryLabels } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canEditEvent, canDeleteEvent, listUpcomingEvents } from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";
import { dateKey, parseMonthParam } from "@/lib/calendar";

export default async function EventsPage(props: PageProps<"/events">) {
  const searchParams = await props.searchParams;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const isAdmin = login.role === "admin";

  const rawView = typeof searchParams.view === "string" ? searchParams.view : undefined;
  const rawDate = typeof searchParams.date === "string" ? searchParams.date : undefined;
  const rawMonth = typeof searchParams.month === "string" ? searchParams.month : undefined;

  const view = rawView === "calendar" ? "calendar" : "list";
  const { year, month } = parseMonthParam(rawMonth);

  const allEvents = await listUpcomingEvents();

  const eventCountsByDate = new Map<string, number>();
  for (const event of allEvents) {
    const key = dateKey(event.eventDatetime);
    eventCountsByDate.set(key, (eventCountsByDate.get(key) ?? 0) + 1);
  }

  const visibleEvents = rawDate
    ? allEvents.filter((event) => dateKey(event.eventDatetime) === rawDate)
    : allEvents;

  const switcherParams = {
    ...(rawDate && { date: rawDate }),
    ...(rawMonth && { month: rawMonth }),
  };
  const calendarParams = {
    ...(rawView && { view: rawView }),
    ...(rawDate && { date: rawDate }),
  };

  const selectedDateLabel = rawDate
    ? new Date(`${rawDate}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Events</h1>
          <div className="flex items-center gap-3">
            <ViewSwitcher view={view} basePath="/events" preserveParams={switcherParams} />
            <Button nativeButton={false} render={<Link href="/events/new" />}>
              New event
            </Button>
          </div>
        </div>

        {selectedDateLabel && (
          <p className="text-sm text-muted-foreground">
            Showing events on {selectedDateLabel} —{" "}
            <Link href="/events" className="underline underline-offset-4">
              clear
            </Link>
          </p>
        )}

        {view === "calendar" && (
          <div className="rounded-lg border p-4">
            <EventCalendar
              year={year}
              month={month}
              selectedDate={rawDate}
              eventCountsByDate={eventCountsByDate}
              size="full"
              basePath="/events"
              preserveParams={calendarParams}
            />
          </div>
        )}

        {visibleEvents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {rawDate ? "No events on this day." : "No upcoming events yet."}
          </p>
        )}

        {visibleEvents.map((event) => {
          const canManage =
            canEditEvent(myBaseProfile.id, event) ||
            canDeleteEvent(myBaseProfile.id, isAdmin, event);
          return (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                </CardTitle>
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

      <aside className="hidden shrink-0 lg:sticky lg:top-4 lg:block lg:w-72">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Jump to a date</h2>
          <EventCalendar
            year={year}
            month={month}
            selectedDate={rawDate}
            eventCountsByDate={eventCountsByDate}
            size="mini"
            basePath="/events"
            preserveParams={calendarParams}
          />
        </div>
      </aside>
    </div>
  );
}
