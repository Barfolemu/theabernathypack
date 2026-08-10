"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getDefaultAvatarsFor } from "@/lib/avatars";
import type { Profile } from "@/db/schema";
import { updateProfileAction, type EditProfileState } from "./actions";

const initialState: EditProfileState = {};

export function EditProfileForm({ profile }: { profile: Profile }) {
  const boundAction = updateProfileAction.bind(null, profile.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [pickedAvatarId, setPickedAvatarId] = useState("");

  const avatarOptions = getDefaultAvatarsFor(profile.profileType);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="defaultAvatarId" value={pickedAvatarId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" defaultValue={profile.displayName} required />
      </div>

      {profile.profileType === "dog" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breed">Breed</Label>
          <Input id="breed" name="breed" defaultValue={profile.breed ?? ""} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Switch to a default avatar</Label>
        <div className="grid grid-cols-5 gap-2">
          {avatarOptions.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => setPickedAvatarId(avatar.id)}
              className={cn(
                "rounded-full ring-2 ring-transparent outline-none",
                pickedAvatarId === avatar.id && "ring-primary",
              )}
            >
              <Image
                src={avatar.path}
                alt={avatar.alt}
                width={56}
                height={56}
                className="rounded-full"
              />
            </button>
          ))}
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
