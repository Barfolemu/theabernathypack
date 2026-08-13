import { redirect } from "next/navigation";
import { resolveAvatarSrc } from "@/components/profile-avatar";
import { getSession } from "@/lib/auth/session";
import { getMyBaseProfile } from "@/lib/profiles";
import { getPack, listManagedProfiles } from "@/lib/relationships";
import { searchBaseProfiles } from "@/lib/services/userSearchService";
import { ExternalPanel } from "./external-panel";
import { InternalPanel } from "./internal-panel";
import { ModeTabs } from "./mode-tabs";
import { ProfileSelector } from "./profile-selector";

export default async function LinkPage(props: PageProps<"/profiles/link">) {
  const searchParams = await props.searchParams;

  const login = await getSession();
  if (!login) redirect("/login");

  const myBaseProfile = await getMyBaseProfile(login.id);
  if (!myBaseProfile) redirect("/account");

  const managedProfiles = await listManagedProfiles(myBaseProfile);

  const rawFor = typeof searchParams.for === "string" ? searchParams.for : undefined;
  const target = managedProfiles.find((profile) => profile.id === rawFor) ?? myBaseProfile;

  const rawMode = typeof searchParams.mode === "string" ? searchParams.mode : undefined;
  const mode = rawMode === "external" ? "external" : "internal";

  const rawQuery = typeof searchParams.q === "string" ? searchParams.q : "";

  const pack = await getPack(target.id);
  // Client Components (InternalPanel/ExternalPanel) can't render the async
  // ProfileAvatar Server Component directly, so avatar URLs are resolved here
  // and passed down as plain strings.
  const packWithAvatars = await Promise.all(
    pack.map(async (member) => ({ ...member, avatarSrc: await resolveAvatarSrc(member.profile) })),
  );

  const rawResults =
    mode === "external" && rawQuery.trim() !== "" ? await searchBaseProfiles(rawQuery, target.id) : [];
  const initialResults = await Promise.all(
    rawResults.map(async (profile) => ({ ...profile, avatarSrc: await resolveAvatarSrc(profile) })),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Link accounts</h1>

      <ProfileSelector profiles={managedProfiles} selectedId={target.id} mode={mode} />
      <ModeTabs targetId={target.id} mode={mode} />

      {mode === "internal" ? (
        <InternalPanel target={target} pack={packWithAvatars} managedProfiles={managedProfiles} />
      ) : (
        <ExternalPanel
          target={target}
          pack={packWithAvatars}
          initialQuery={rawQuery}
          initialResults={initialResults}
        />
      )}
    </div>
  );
}
