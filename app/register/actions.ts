"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { logins } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordHash = await hashPassword(password);

  let loginId: string;
  try {
    const [login] = await db
      .insert(logins)
      .values({ email, passwordHash })
      .returning({ id: logins.id });
    loginId = login.id;
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return { error: "An account with that email already exists." };
    }
    throw err;
  }

  await createSession(loginId);
  redirect("/account");
}
