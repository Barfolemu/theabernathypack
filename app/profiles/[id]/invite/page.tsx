import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canControlProfile, getMyBaseProfile } from "@/lib/profiles";
import { InviteForm } from "./invite-form";

export default async function InviteProfilePage(props: PageProps<"/profiles/[id]/invite">) {
  const { id } = await props.params;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (
    !target ||
    !canControlProfile(myBaseProfile, target) ||
    target.profileType !== "human" ||
    target.loginId !== null
  ) {
    redirect("/profiles");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invite {target.displayName}</CardTitle>
          <CardDescription>
            Send an email invite so they can create their own account and claim this profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm profileId={target.id} />
        </CardContent>
      </Card>
    </div>
  );
}
