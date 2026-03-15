import { Elysia } from "elysia";
import { auth, type User } from "../auth";

// ── Auth plugin with macro for protected routes ──────────────────────────────
//
// Usage in route handlers:
//   .use(betterAuthPlugin)
//   .get("/protected", ({ user }) => { ... }, { requireAuth: true })
//   .get("/public",    ({ request }) => { ... })    // optional auth via getSession()
//
export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .macro({
    requireAuth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return status(401);
        return {
          user: session.user as User,
          session: session.session,
        };
      },
    },
  });

// Helper for routes that need optional auth (public but personalized)
export async function getOptionalSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

// Legacy exports kept so any leftover imports don't break during migration
// @deprecated Use betterAuthPlugin instead
export const authedApp = betterAuthPlugin;
export const authPlugin = betterAuthPlugin;

export type { User };
