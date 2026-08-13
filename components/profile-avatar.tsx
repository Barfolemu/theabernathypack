import Image from "next/image";
import { getDefaultAvatar, getDefaultAvatarsFor } from "@/lib/avatars";
import { getAvatarViewUrl } from "@/lib/s3";
import type { Profile } from "@/db/schema";

type AvatarProfile = Pick<Profile, "avatarKey" | "defaultAvatarId" | "profileType" | "displayName">;

// Server-only (pulls in lib/s3's presigned-URL signing). Exported so server
// components/actions that need a plain image URL to pass into a Client
// Component (which can't render the async ProfileAvatar component directly)
// can resolve it themselves.
export async function resolveAvatarSrc(profile: AvatarProfile): Promise<string> {
  return profile.avatarKey
    ? getAvatarViewUrl(profile.avatarKey)
    : (getDefaultAvatar(profile.defaultAvatarId) ?? getDefaultAvatarsFor(profile.profileType)[0]).path;
}

export async function ProfileAvatar({
  profile,
  size = 64,
}: {
  profile: AvatarProfile;
  size?: number;
}) {
  const src = await resolveAvatarSrc(profile);

  return (
    <Image
      src={src}
      alt={profile.displayName}
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
