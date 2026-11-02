"use client";

import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Starts Google sign-in via Neon Auth. Returns to `callbackPath` afterwards,
 * or to the current page when it's omitted. The origin must be a trusted
 * domain in the Neon Auth settings.
 */
export function SignInButton({
  callbackPath,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "asChild"> & { callbackPath?: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const path =
      callbackPath ?? window.location.pathname + window.location.search;
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: new URL(path, window.location.origin).toString(),
    });
    if (error) {
      setPending(false);
      alert(error.message ?? "Sign in failed");
    }
  }

  return (
    <Button {...props} disabled={pending || props.disabled} onClick={signIn}>
      {children}
    </Button>
  );
}

/** Signs out (of Neon Auth, or the local dev login) and returns home. */
export function SignOutButton({
  devSession = false,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "asChild"> & { devSession?: boolean }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    if (devSession) {
      await fetch("/api/auth/dev-login", { method: "DELETE" });
    } else {
      await authClient.signOut();
    }
    window.location.assign("/");
  }

  return (
    <Button {...props} disabled={pending || props.disabled} onClick={signOut}>
      {children}
    </Button>
  );
}
