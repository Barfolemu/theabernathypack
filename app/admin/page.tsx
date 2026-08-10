import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { AdminResetPasswordForm } from "./admin-reset-password-form";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Reset a user&apos;s password.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
