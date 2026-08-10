"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { logins } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsForLogin, requireAdmin } from "@/lib/auth/session";

export type AdminResetPasswordState = { error?: string; success?: string };

export async function adminResetPasswordAction(
  _prevState: AdminResetPasswordState,
  formData: FormData,
): Promise<AdminResetPasswordState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const [login] = await db.select().from(logins).where(eq(logins.email, email)).limit(1);
  if (!login) {
    return { error: "No account with that email exists." };
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(logins)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(logins.id, login.id));
  await destroyAllSessionsForLogin(login.id);

  return { success: `Password reset for ${login.email}. Their existing sessions were logged out.` };
}
