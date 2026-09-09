import Link from "next/link";
import { LogIn, ShieldAlert } from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await getAuth();

  if (!auth) {
    return (
      <Gate
        icon={<LogIn className="h-8 w-8 text-primary" />}
        title="Sign in required"
        body="Sign in with your Google account to manage reviews."
        action={
          <Button asChild>
            <a href="/api/auth/login">Sign in with Google</a>
          </Button>
        }
      />
    );
  }

  if (!auth.isAdmin) {
    return (
      <Gate
        icon={<ShieldAlert className="h-8 w-8 text-destructive" />}
        title="No edit access"
        body={`You're signed in as ${auth.user.email}, but that account isn't on the admin allowlist. You can still browse the public views.`}
        action={
          <Button asChild variant="outline">
            <Link href="/">Back to reviews</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground">
          Add and edit cafes, reviews and sign-in sessions. Changes appear on
          the map and list views immediately.
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}

function Gate({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader className="items-center text-center">
          {icon}
          <CardTitle className="mt-2">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex justify-center">{action}</div>
        </CardContent>
      </Card>
    </div>
  );
}
