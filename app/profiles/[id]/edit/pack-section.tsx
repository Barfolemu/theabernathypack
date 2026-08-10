"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { relationshipCategoryLabels, type Profile, type RelationshipCategory } from "@/db/schema";
import { addRelationshipAction, type AddRelationshipState } from "./actions";

const initialState: AddRelationshipState = {};

export function AddToPackForm({
  profileId,
  linkable,
  categories,
}: {
  profileId: string;
  linkable: Profile[];
  categories: readonly RelationshipCategory[];
}) {
  const boundAction = addRelationshipAction.bind(null, profileId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (linkable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other profiles available to link right now.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otherProfileId">Link to</Label>
        <select
          id="otherProfileId"
          name="otherProfileId"
          required
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          {linkable.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Relationship</Label>
        <select
          id="category"
          name="category"
          required
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          {categories.map((category) => (
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
        {pending ? "Linking…" : "Add to pack"}
      </Button>
    </form>
  );
}
