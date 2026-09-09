import Link from "next/link";
import { Coffee, LayoutDashboard, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

interface HeaderUser {
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Coffee className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Teignmouth Flat Whites</span>
          <span className="sm:hidden">Flat Whites</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user?.isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}

          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.name ?? user.email}
                {!user.isAdmin && " (read-only)"}
              </span>
              <Button asChild variant="outline" size="sm">
                <a href="/api/auth/logout">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </a>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/api/auth/login">
                <LogIn className="h-4 w-4" />
                Sign in
              </a>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
