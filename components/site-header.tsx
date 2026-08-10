import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export async function SiteHeader() {
  const login = await getSession();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 text-sm">
      <Link href="/" className="font-medium">
        theabernathypack
      </Link>
      <nav className="flex items-center gap-4">
        {login ? (
          <>
            {login.role === "admin" && (
              <Link href="/admin" className="underline-offset-4 hover:underline">
                Admin
              </Link>
            )}
            <Link href="/events" className="underline-offset-4 hover:underline">
              Events
            </Link>
            <Link href="/profiles" className="underline-offset-4 hover:underline">
              My Profiles
            </Link>
            <Link href="/account" className="underline-offset-4 hover:underline">
              Account
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="underline-offset-4 hover:underline">
              Log in
            </Link>
            <Link href="/register" className="underline-offset-4 hover:underline">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
