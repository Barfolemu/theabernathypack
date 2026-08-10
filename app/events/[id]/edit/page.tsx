import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canDeleteEvent, canEditEvent } from "@/lib/events";
import { getMyBaseProfile } from "@/lib/profiles";
import { deleteEventAction } from "./actions";
import { EditEventForm } from "./edit-event-form";

export default async function EditEventPage(props: PageProps<"/events/[id]/edit">) {
  const { id } = await props.params;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) redirect("/events");

  const isAdmin = login.role === "admin";
  const editable = canEditEvent(myBaseProfile.id, event);
  const deletable = canDeleteEvent(myBaseProfile.id, isAdmin, event);
  if (!editable && !deletable) redirect("/events");

  const boundDelete = deleteEventAction.bind(null, event.id);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{editable ? "Edit event" : event.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {editable && <EditEventForm event={event} />}

          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
              Delete event
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {event.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can&apos;t be undone.
                  {!editable && isAdmin ? " You're deleting this as an admin, not the creator." : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form id="delete-event-form" action={boundDelete} />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction type="submit" form="delete-event-form" variant="destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
