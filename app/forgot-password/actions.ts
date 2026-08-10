"use server";

import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { logins, passwordResetTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_MESSAGE = "If that email is registered, a reset link has been sent.";

export type ForgotPasswordState = { message?: string };

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const [login] = await db.select().from(logins).where(eq(logins.email, email)).limit(1);

  if (login && login.status === "active") {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);

    await db.insert(passwordResetTokens).values({ loginId: login.id, tokenHash, expiresAt });
    try {
      await sendPasswordResetEmail(login.email, token);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return { message: GENERIC_MESSAGE };
}
