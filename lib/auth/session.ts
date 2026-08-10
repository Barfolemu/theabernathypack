import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, logins, type Login } from "@/db/schema";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(loginId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ loginId, tokenHash: hashToken(token), expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<Login | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ login: logins, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(logins, eq(sessions.loginId, logins.id))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);

  if (!row || row.expiresAt < new Date() || row.login.status !== "active") {
    return null;
  }

  return row.login;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForLogin(loginId: string) {
  await db.delete(sessions).where(eq(sessions.loginId, loginId));
}

export async function requireAdmin(): Promise<Login> {
  const login = await getSession();
  if (!login) redirect("/login");
  if (login.role !== "admin") redirect("/account");
  return login;
}
