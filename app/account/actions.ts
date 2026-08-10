"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { logins } from "@/db/schema";
import { destroyAllSessionsForLogin, destroySession, getSession } from "@/lib/auth/session";

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function deactivateAction() {
  const login = await getSession();
  if (!login) redirect("/login");

  await db
    .update(logins)
    .set({ status: "deactivated", updatedAt: new Date() })
    .where(eq(logins.id, login.id));
  await destroyAllSessionsForLogin(login.id);

  redirect("/login?deactivated=1");
}
