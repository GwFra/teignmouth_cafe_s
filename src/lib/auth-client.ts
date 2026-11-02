"use client";

import { createAuthClient } from "@neon/auth/next";

/** Browser-side Neon Auth client; talks to /api/auth/* (see app/api/auth). */
export const authClient = createAuthClient();
