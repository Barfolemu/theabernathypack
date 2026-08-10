import { redirect } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { deactivateAction, logoutAction } from "./actions";

export default async function AccountPage() {
  const login = await getSession();
  if (!login) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>{login.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Log out
            </Button>
          </form>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="destructive" className="w-full" />
              }
            >
              Deactivate account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be logged out everywhere and won&apos;t be able to log back in
                  until your account is reactivated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form id="deactivate-form" action={deactivateAction} />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  type="submit"
                  form="deactivate-form"
                  variant="destructive"
                >
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
