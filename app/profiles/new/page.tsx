import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";
import { NewProfileForm } from "./new-profile-form";

export default async function NewProfilePage() {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Add a profile</CardTitle>
          <CardDescription>
            Add a dog, kid, partner, or anyone else in your pack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
