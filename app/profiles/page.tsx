import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";

export default async function ProfilesPage() {
  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const myProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.creatorId, myBaseProfile.id));

  const others = myProfiles.filter((profile) => profile.id !== myBaseProfile.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your profiles</h1>
        <Button nativeButton={false} render={<Link href="/profiles/new" />}>New profile</Button>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <ProfileAvatar profile={myBaseProfile} size={48} />
          <div>
            <CardTitle>{myBaseProfile.displayName}</CardTitle>
            <CardDescription>You</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/profiles/${myBaseProfile.id}/edit`} />}
          >
            Edit
          </Button>
        </CardContent>
      </Card>

      {others.map((profile) => {
        const canInvite =
          profile.profileType === "human" && profile.loginId === null;
        return (
          <Card key={profile.id}>
            <CardHeader className="flex items-center gap-3">
              <ProfileAvatar profile={profile} size={48} />
              <div>
                <CardTitle>{profile.displayName}</CardTitle>
                <CardDescription>
                  {profile.profileType === "dog"
                    ? profile.breed ?? "Dog"
                    : profile.loginId
                      ? "Has their own account"
                      : "Not yet registered"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/profiles/${profile.id}/edit`} />}
              >
                Edit
              </Button>
              {canInvite && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/profiles/${profile.id}/invite`} />}
                >
                  Send invite
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      {others.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          You haven&apos;t added any dogs, kids, or partners yet.
        </p>
      )}
    </div>
  );
}
