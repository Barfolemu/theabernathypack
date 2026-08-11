"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { logins } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [login] = await db.select().from(logins).where(eq(logins.email, email)).limit(1);

  if (!login || !(await verifyPassword(password, login.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  if (login.status === "deactivated") {
    return { error: "This account has been deactivated." };
  }

  await createSession(login.id);
  redirect("/events");
}
