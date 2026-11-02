import Image from "next/image";
import Link from "next/link";
import { FlaskConical, LayoutDashboard, LogIn, LogOut } from "lucide-react";

import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface HeaderUser {
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  isDevSession: boolean;
}

export function SiteHeader({
  user,
  devLogin = false,
}: {
  user: HeaderUser | null;
  /** Show the local-only dev sign-in buttons (see lib/dev-login). */
  devLogin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/cat-latte-icon-1024x1024.png"
            width={40}
            height={40}
            className="h-10 w-10"
            alt="flat-whites-logo"
          />
          <span className="hidden sm:inline">Teignmouth Flat Whites</span>
          <span className="sm:hidden">Flat Whites</span>
        </Link>

        <nav className="flex items-center gap-2">
          <ThemeToggle />

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
              <SignOutButton
                variant="outline"
                size="sm"
                devSession={user.isDevSession}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </SignOutButton>
            </>
          ) : (
            <>
              {devLogin && (
                <>
                  {/* Full page loads: the dev-login route sets a cookie and
                      redirects. The lint rule mistakes it for a page because
                      of the api/auth/[...path] catch-all. */}
                  <Button asChild variant="outline" size="sm">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                      href="/api/auth/dev-login?as=admin"
                      title="Sign in as an admin without Google (local dev only)"
                    >
                      <FlaskConical className="h-4 w-4" />
                      Dev admin
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                      href="/api/auth/dev-login?as=viewer"
                      title="Sign in as a read-only user without Google (local dev only)"
                    >
                      Dev viewer
                    </a>
                  </Button>
                </>
              )}
              <SignInButton size="sm">
                <LogIn className="h-4 w-4" />
                Sign in
              </SignInButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
