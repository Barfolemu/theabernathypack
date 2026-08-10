import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const login = await getSession();
  redirect(login ? "/events" : "/login");
}
