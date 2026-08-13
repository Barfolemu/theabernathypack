"use client";

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
import { removeLinkAction } from "./actions";

export function UnlinkButton({
  sourceProfileId,
  relationshipId,
  targetName,
}: {
  sourceProfileId: string;
  relationshipId: string;
  targetName: string;
}) {
  const formId = `unlink-${relationshipId}`;
  async function boundAction(formData: FormData) {
    await removeLinkAction({}, formData);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        Unlink
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink {targetName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the connection. Either side can re-link later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form id={formId} action={boundAction}>
          <input type="hidden" name="sourceProfileId" value={sourceProfileId} />
          <input type="hidden" name="relationshipId" value={relationshipId} />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form={formId} variant="destructive">
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
