import type { Metadata } from "next";
import "./globals.css";

import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Teignmouth Flat Whites",
  description:
    "Ratings, cost and 'was it worth it' for flat whites across the cafes of Teignmouth.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();

  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">
        <SiteHeader
          user={
            auth
              ? {
                  name: auth.user.name,
                  email: auth.user.email,
                  image: auth.user.image,
                  isAdmin: auth.isAdmin,
                }
              : null
          }
        />
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
