import type { profiles } from "@/db/schema";

type ProfileType = (typeof profiles.$inferSelect)["profileType"];

export type DefaultAvatar = {
  id: string;
  profileType: ProfileType;
  path: string;
  alt: string;
};

// Descriptions sourced from the curated avatar set (images/avatars/avatar_profiles.md).
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: "human-01", profileType: "human", path: "/avatars/human-01.png", alt: "Young man with short black hair and a friendly smile" },
  { id: "human-02", profileType: "human", path: "/avatars/human-02.png", alt: "Young woman with long brown hair and a soft smile" },
  { id: "human-03", profileType: "human", path: "/avatars/human-03.png", alt: "Middle-aged man with a short beard and relaxed expression" },
  { id: "human-04", profileType: "human", path: "/avatars/human-04.png", alt: "Middle-aged woman with glasses and a warm smile" },
  { id: "human-05", profileType: "human", path: "/avatars/human-05.png", alt: "Older man with white hair, a full white beard, and a kind expression" },
  { id: "human-06", profileType: "human", path: "/avatars/human-06.png", alt: "Older woman with silver hair and a gentle smile" },
  { id: "human-07", profileType: "human", path: "/avatars/human-07.png", alt: "Teenager with a modern hairstyle and a bright expression" },
  { id: "human-08", profileType: "human", path: "/avatars/human-08.png", alt: "Bald man with a friendly smile" },
  { id: "human-09", profileType: "human", path: "/avatars/human-09.png", alt: "Woman wearing a hijab with a warm smile" },
  { id: "human-10", profileType: "human", path: "/avatars/human-10.png", alt: "Man with curly hair, a short beard, and a cheerful expression" },
  { id: "dog-01", profileType: "dog", path: "/avatars/dog-01.png", alt: "Dog avatar 1" },
  { id: "dog-02", profileType: "dog", path: "/avatars/dog-02.png", alt: "Dog avatar 2" },
  { id: "dog-03", profileType: "dog", path: "/avatars/dog-03.png", alt: "Dog avatar 3" },
  { id: "dog-04", profileType: "dog", path: "/avatars/dog-04.png", alt: "Dog avatar 4" },
];

export function getDefaultAvatar(id: string | null | undefined): DefaultAvatar | undefined {
  if (!id) return undefined;
  return DEFAULT_AVATARS.find((avatar) => avatar.id === id);
}

export function getDefaultAvatarsFor(profileType: ProfileType): DefaultAvatar[] {
  return DEFAULT_AVATARS.filter((avatar) => avatar.profileType === profileType);
}
