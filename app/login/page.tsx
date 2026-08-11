import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const login = await getSession();
  if (login) redirect("/events");

  const searchParams = await props.searchParams;
  let notice: string | undefined;
  if (searchParams.deactivated) notice = "Your account has been deactivated.";
  else if (searchParams.reset) notice = "Your password has been reset. Log in with your new password.";

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to theabernathypack.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm notice={notice} />
        </CardContent>
      </Card>
    </div>
  );
}
