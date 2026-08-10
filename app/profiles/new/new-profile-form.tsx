"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getDefaultAvatarsFor } from "@/lib/avatars";
import { createProfileAction, type CreateProfileState } from "./actions";

const initialState: CreateProfileState = {};

export function NewProfileForm() {
  const [state, formAction, pending] = useActionState(createProfileAction, initialState);
  const [profileType, setProfileType] = useState<"human" | "dog">("dog");
  const [avatarId, setAvatarId] = useState(getDefaultAvatarsFor("dog")[0].id);

  function selectType(type: "human" | "dog") {
    setProfileType(type);
    setAvatarId(getDefaultAvatarsFor(type)[0].id);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profileType" value={profileType} />
      <input type="hidden" name="defaultAvatarId" value={avatarId} />

      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={profileType === "dog" ? "default" : "outline"}
            onClick={() => selectType("dog")}
          >
            Dog
          </Button>
          <Button
            type="button"
            variant={profileType === "human" ? "default" : "outline"}
            onClick={() => selectType("human")}
          >
            Person
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" name="displayName" required />
      </div>

      {profileType === "dog" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breed">Breed</Label>
          <Input id="breed" name="breed" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Avatar</Label>
        <div className="grid grid-cols-5 gap-2">
          {getDefaultAvatarsFor(profileType).map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => setAvatarId(avatar.id)}
              className={cn(
                "rounded-full ring-2 ring-transparent outline-none",
                avatarId === avatar.id && "ring-primary",
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
        {pending ? "Creating…" : "Create profile"}
      </Button>
    </form>
  );
}
