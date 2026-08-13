"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { humanRelationshipCategories, relationshipCategoryLabels, type Profile } from "@/db/schema";
import type { PackMember } from "@/lib/relationships";
import {
  createLinkAction,
  searchUsersAction,
  type LinkFormState,
  type ProfileSearchResult,
} from "./actions";
import { UnlinkButton } from "./unlink-button";

const DEBOUNCE_MS = 300;
const initialState: LinkFormState = {};

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function ExternalPanel({
  target,
  pack,
  initialQuery,
  initialResults,
}: {
  target: Profile;
  pack: (PackMember & { avatarSrc: string })[];
  initialQuery: string;
  initialResults: ProfileSearchResult[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [pending, startTransition] = useTransition();
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;
    const id = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchUsersAction(target.id, trimmedQuery));
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [trimmedQuery, target.id]);

  const visibleResults = trimmedQuery ? results : [];

  const relationshipIdByProfileId = new Map(
    pack.map((member) => [member.profile.id, member.relationshipId]),
  );

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name…"
      />
      {pending && <p className="text-sm text-muted-foreground">Searching…</p>}
      {!pending && trimmedQuery !== "" && visibleResults.length === 0 && (
        <p className="text-sm text-muted-foreground">No matches.</p>
      )}
      {visibleResults.map((profile) => (
        <ExternalResultRow
          key={profile.id}
          sourceProfileId={target.id}
          profile={profile}
          relationshipId={relationshipIdByProfileId.get(profile.id)}
        />
      ))}
    </div>
  );
}

function ExternalResultRow({
  sourceProfileId,
  profile,
  relationshipId,
}: {
  sourceProfileId: string;
  profile: ProfileSearchResult;
  relationshipId?: string;
}) {
  const [state, formAction, pending] = useActionState(createLinkAction, initialState);

  if (relationshipId) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Image
          src={profile.avatarSrc}
          alt={profile.displayName}
          width={40}
          height={40}
          className="rounded-full object-cover"
          style={{ width: 40, height: 40 }}
        />
        <p className="flex-1 text-sm font-medium">{profile.displayName}</p>
        <UnlinkButton
          sourceProfileId={sourceProfileId}
          relationshipId={relationshipId}
          targetName={profile.displayName}
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Image
          src={profile.avatarSrc}
          alt={profile.displayName}
          width={40}
          height={40}
          className="rounded-full object-cover"
          style={{ width: 40, height: 40 }}
        />
        <p className="flex-1 text-sm font-medium">{profile.displayName}</p>
      </div>
      <input type="hidden" name="sourceProfileId" value={sourceProfileId} />
      <input type="hidden" name="targetProfileId" value={profile.id} />
      <div className="flex items-center gap-2">
        <select name="category" required className={selectClass}>
          {humanRelationshipCategories.map((category) => (
            <option key={category} value={category}>
              {relationshipCategoryLabels[category]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Linking…" : "Link"}
        </Button>
      </div>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
