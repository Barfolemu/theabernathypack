import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>New event</CardTitle>
          <CardDescription>Plan a walk, hike, or hangout for the pack.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewEventForm />
        </CardContent>
      </Card>
    </div>
  );
}
