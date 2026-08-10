import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RegisterPage(props: PageProps<"/register">) {
  const login = await getSession();
  if (login) redirect("/account");

  const searchParams = await props.searchParams;
  const rawInvite = searchParams.invite;
  const inviteToken = typeof rawInvite === "string" ? rawInvite : undefined;

  let inviteEmail: string | undefined;
  let inviteInvalid = false;
  if (inviteToken) {
    if (!UUID_RE.test(inviteToken)) {
      inviteInvalid = true;
    } else {
      const [invite] = await db.select().from(invites).where(eq(invites.id, inviteToken)).limit(1);
      if (invite) {
        inviteEmail = invite.email;
      } else {
        inviteInvalid = true;
      }
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            {inviteToken
              ? "Accept your invite to join the pack."
              : "Join the pack at Abernathy Park."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteInvalid ? (
            <Alert variant="destructive">
              <AlertDescription>This invite link is invalid or has expired.</AlertDescription>
            </Alert>
          ) : (
            <RegisterForm inviteToken={inviteToken} inviteEmail={inviteEmail} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
