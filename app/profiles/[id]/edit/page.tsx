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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile-avatar";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { canControlProfile, getMyBaseProfile } from "@/lib/profiles";
import { deleteProfileAction } from "./actions";
import { AvatarUploader } from "./avatar-uploader";
import { EditProfileForm } from "./edit-profile-form";

export default async function EditProfilePage(props: PageProps<"/profiles/[id]/edit">) {
  const { id } = await props.params;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!target || !canControlProfile(myBaseProfile, target)) redirect("/profiles");

  const isBaseProfile = target.id === myBaseProfile.id;
  const boundDelete = deleteProfileAction.bind(null, target.id);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 p-4">
      <Card>
        <CardHeader className="flex items-center gap-3">
          <ProfileAvatar profile={target} size={64} />
          <div>
            <CardTitle>{target.displayName}</CardTitle>
            <CardDescription>{isBaseProfile ? "Your profile" : target.profileType}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <AvatarUploader profileId={target.id} />
          <EditProfileForm profile={target} />

          {!isBaseProfile && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
                Delete profile
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {target.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This can&apos;t be undone. Any outstanding invite for this profile will also
                    be canceled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <form id="delete-profile-form" action={boundDelete} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction type="submit" form="delete-profile-form" variant="destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
