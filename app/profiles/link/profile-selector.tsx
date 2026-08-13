"use client";

import { Label } from "@/components/ui/label";
import type { Profile } from "@/db/schema";

export function ProfileSelector({
  profiles,
  selectedId,
  mode,
}: {
  profiles: Profile[];
  selectedId: string;
  mode: "internal" | "external";
}) {
  return (
    <form action="/profiles/link" className="flex flex-col gap-1.5">
      <input type="hidden" name="mode" value={mode} />
      <Label htmlFor="for">Managing links for</Label>
      <select
        id="for"
        name="for"
        defaultValue={selectedId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.displayName}
          </option>
        ))}
      </select>
    </form>
  );
}
