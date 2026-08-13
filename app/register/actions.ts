"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { logins, profiles, invites } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RegisterState = { error?: string };

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && err.code === "23505") return true;
  if ("cause" in err) return isUniqueViolation(err.cause);
  return false;
}

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const inviteToken = String(formData.get("inviteToken") ?? "").trim() || undefined;
  const displayName = String(formData.get("displayName") ?? "").trim();
  const submittedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!displayName) {
    return { error: "Enter your name." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  let invite: typeof invites.$inferSelect | undefined;
  if (inviteToken) {
    if (!UUID_RE.test(inviteToken)) {
      return { error: "This invite link is invalid or has expired." };
    }
    const [row] = await db.select().from(invites).where(eq(invites.id, inviteToken)).limit(1);
    if (!row) {
      return { error: "This invite link is invalid or has expired." };
    }
    invite = row;
  }

  // Invite acceptance always uses the invited email, ignoring whatever the
  // (normally read-only) submitted email field contains.
  const email = invite ? invite.email : submittedEmail;
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const passwordHash = await hashPassword(password);

  let loginId: string;
  try {
    loginId = await db.transaction(async (tx) => {
      const [login] = await tx
        .insert(logins)
        .values({ email, passwordHash })
        .returning({ id: logins.id });

      if (invite) {
        await tx
          .update(profiles)
          .set({ loginId: login.id })
          .where(eq(profiles.id, invite.profileId));
        await tx.delete(invites).where(eq(invites.id, invite.id));
      } else {
        const profileId = randomUUID();
        await tx.insert(profiles).values({
          id: profileId,
          profileType: "human",
          displayName,
          loginId: login.id,
          creatorId: profileId,
        });
      }

      return login.id;
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { error: "An account with that email already exists." };
    }
    throw err;
  }

  await createSession(loginId);
  redirect("/profiles");
}
