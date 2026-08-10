import Image from "next/image";
import { getDefaultAvatar, getDefaultAvatarsFor } from "@/lib/avatars";
import { getAvatarViewUrl } from "@/lib/s3";
import type { Profile } from "@/db/schema";

export async function ProfileAvatar({
  profile,
  size = 64,
}: {
  profile: Pick<Profile, "avatarKey" | "defaultAvatarId" | "profileType" | "displayName">;
  size?: number;
}) {
  const src = profile.avatarKey
    ? await getAvatarViewUrl(profile.avatarKey)
    : (getDefaultAvatar(profile.defaultAvatarId) ?? getDefaultAvatarsFor(profile.profileType)[0])
        .path;

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
