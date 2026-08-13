"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  humanRelationshipCategories,
  relationshipCategoryLabels,
  type Profile,
} from "@/db/schema";
import type { PackMember } from "@/lib/relationships";
import { createLinkAction, type LinkFormState } from "./actions";
import { UnlinkButton } from "./unlink-button";

const initialState: LinkFormState = {};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function InternalPanel({
  target,
  pack,
  managedProfiles,
}: {
  target: Profile;
  pack: (PackMember & { avatarSrc: string })[];
  managedProfiles: Profile[];
}) {
  const [state, formAction, pending] = useActionState(createLinkAction, initialState);

  const packIds = new Set(pack.map((member) => member.profile.id));
  const addable = managedProfiles.filter(
    (profile) => profile.id !== target.id && !packIds.has(profile.id),
  );
  const [selectedId, setSelectedId] = useState(addable[0]?.id ?? "");
  const selectedProfile = addable.find((profile) => profile.id === selectedId) ?? addable[0];
  const categoryOptions =
    selectedProfile?.profileType === "dog" ? (["pet"] as const) : humanRelationshipCategories;

  return (
    <div className="flex flex-col gap-4">
      {pack.length === 0 && <p className="text-sm text-muted-foreground">No connections yet.</p>}
      {pack.map((member) => (
        <div key={member.relationshipId} className="flex items-center gap-3">
          <Image
            src={member.avatarSrc}
            alt={member.profile.displayName}
            width={40}
            height={40}
            className="rounded-full object-cover"
            style={{ width: 40, height: 40 }}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{member.profile.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {relationshipCategoryLabels[member.category]}
            </p>
          </div>
          <UnlinkButton
            sourceProfileId={target.id}
            relationshipId={member.relationshipId}
            targetName={member.profile.displayName}
          />
        </div>
      ))}

      {addable.length > 0 && (
        <form action={formAction} className="flex flex-col gap-3 border-t pt-4">
          <input type="hidden" name="sourceProfileId" value={target.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetProfileId">Add unlinked household profile</Label>
            <select
              id="targetProfileId"
              name="targetProfileId"
              required
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className={selectClass}
            >
              {addable.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Relationship</Label>
            <select id="category" name="category" required className={selectClass}>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {relationshipCategoryLabels[category]}
                </option>
              ))}
            </select>
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Linking…" : "Link"}
          </Button>
        </form>
      )}
    </div>
  );
}
