import type { NextRequest } from "next/server";

import { getNeonAuth } from "@/lib/neon-auth";

type Middleware = ReturnType<ReturnType<typeof getNeonAuth>["middleware"]>;

let middleware: Middleware | null = null;

/**
 * Completes Google sign-in: Neon Auth redirects back with a one-time
 * `neon_auth_session_verifier` param, which the middleware exchanges for the
 * session cookie before redirecting to the same URL without it.
 *
 * It only runs on that redirect (see `config`), because the middleware would
 * otherwise send signed-out visitors away from the public pages. Those pages
 * are listed as public so a failed exchange just leaves the visitor signed
 * out. `loginUrl` must not be one of them: the middleware skips the exchange
 * on its login page.
 */
export default function proxy(request: NextRequest) {
  middleware ??= getNeonAuth().middleware({ publicRoutes: ["/", "/admin"] });
  return middleware(request);
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/|favicon.ico).*)",
      has: [{ type: "query", key: "neon_auth_session_verifier" }],
    },
  ],
};
