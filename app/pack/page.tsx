import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";
import { getPack } from "@/lib/relationships";
import { relationshipCategoryLabels } from "@/db/schema";

export default async function MyPackPage() {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const pack = await getPack(myBaseProfile.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">My Pack</h1>

      {pack.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nobody&apos;s linked to you yet. Add a dog, kid, or partner from{" "}
          <Link href="/profiles" className="underline">
            your profiles
          </Link>
          .
        </p>
      )}

      {pack.map((member) => (
        <Card key={member.relationshipId}>
          <CardHeader className="flex items-center gap-3">
            <ProfileAvatar profile={member.profile} size={48} />
            <div>
              <CardTitle>{member.profile.displayName}</CardTitle>
              <CardDescription>{relationshipCategoryLabels[member.category]}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
