"use server";

import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { logins, passwordResetTokens } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsForLogin } from "@/lib/auth/session";

export type ResetPasswordState = { error?: string };

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [resetRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!resetRow || resetRow.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(logins)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(logins.id, resetRow.loginId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.loginId, resetRow.loginId));
  await destroyAllSessionsForLogin(resetRow.loginId);

  redirect("/login?reset=1");
}
