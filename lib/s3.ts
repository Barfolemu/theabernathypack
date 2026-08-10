import "server-only";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = "aberpack-photos-bucket";

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const s3 = new S3Client({ region: process.env.AWS_REGION });

export function isAllowedAvatarContentType(contentType: string): boolean {
  return contentType in ALLOWED_CONTENT_TYPES;
}

export async function createAvatarUploadUrl(profileId: string, contentType: string) {
  if (!isAllowedAvatarContentType(contentType)) {
    throw new Error(`Unsupported avatar content type: ${contentType}`);
  }
  const ext = ALLOWED_CONTENT_TYPES[contentType];
  const key = `avatars/${profileId}/${randomUUID()}.${ext}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { url, key };
}

export async function getAvatarViewUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}
