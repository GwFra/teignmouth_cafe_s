import { getNeonAuth } from "@/lib/neon-auth";

export const dynamic = "force-dynamic";

type Handlers = ReturnType<ReturnType<typeof getNeonAuth>["handler"]>;
type Method = keyof Handlers;

let handlers: Handlers | null = null;

/**
 * Proxies /api/auth/* (sign-in, OAuth callback, sign-out, get-session, …) to
 * Neon Auth. Built on first request so the env isn't needed at build time.
 */
function forward(method: Method): Handlers[Method] {
  return (req, ctx) => {
    handlers ??= getNeonAuth().handler();
    return handlers[method](req, ctx);
  };
}

export const GET = forward("GET");
export const POST = forward("POST");
export const PUT = forward("PUT");
export const PATCH = forward("PATCH");
export const DELETE = forward("DELETE");
